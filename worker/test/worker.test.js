import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  EMAIL_ATTACHMENT_LIMIT,
  MAX_FILE_SIZE,
  arrayBufferToBase64,
  createQuoteId,
  sanitizeFileName,
  validateFile,
} from "../src/index.js";
import worker from "../src/index.js";

function createDb(events = []) {
  return {
    prepare(sql) {
      const statement = {
        async run() {
          events.push(sql.includes("CREATE TABLE") ? "d1:create" : "d1:run");
        },
        bind() {
          return {
            async run() {
              events.push(
                sql.includes("INSERT INTO quote_requests")
                  ? "d1:insert"
                  : sql.includes("quote_downloads")
                    ? "d1:download"
                    : "d1:update",
              );
            },
            async first() {
              return null;
            },
          };
        },
      };
      return statement;
    },
  };
}

function baseForm({ withFile = true } = {}) {
  const form = new FormData();
  form.set("name", "Canlı Test");
  form.set("email", "info@minifabrika.com");
  form.set("production_type", "Adetli parça üretimi");
  form.set("quantity", "10");
  form.set("material", "PLA");
  form.set("sample", "no");
  form.set("use_case", "Otomatik test");
  form.set("consent", "on");
  if (withFile) {
    form.set("attachment", new File(["solid test\nendsolid test\n"], "test.stl", { type: "model/stl" }));
  }
  return form;
}

test("quote identifiers match the public contract", () => {
  assert.match(createQuoteId(new Date("2026-09-11T00:00:00Z")), /^MF-20260911-[A-Z0-9]{5}$/);
});

test("uploaded file names are sanitized and keep an allowed extension", () => {
  assert.equal(sanitizeFileName("../../Müşteri ölçü 01.STL"), "Musteri-olcu-01.stl");
});

test("file upload is optional", async () => {
  assert.equal(await validateFile(null), null);
});

test("ZIP validation reads the signature but never extracts the archive", async () => {
  const valid = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2])], "parcalar.zip");
  assert.equal(await validateFile(valid), null);
  const disguised = new File(["not a zip"], "parcalar.zip");
  assert.match(await validateFile(disguised), /geçerli bir ZIP/);
});

test("the 50 MB maximum is enforced", async () => {
  const oversized = { name: "model.stl", size: MAX_FILE_SIZE + 1 };
  Object.setPrototypeOf(oversized, File.prototype);
  assert.match(await validateFile(oversized), /50 MB/);
});

test("base64 encoder produces attachment-ready content", () => {
  const value = arrayBufferToBase64(new TextEncoder().encode("MiniFabrika").buffer);
  assert.equal(value, "TWluaUZhYnJpa2E=");
  assert.equal(EMAIL_ATTACHMENT_LIMIT, 20 * 1024 * 1024);
});

test("quote form still targets the Worker and keeps FormSubmit isolated", async () => {
  const root = new URL("../../", import.meta.url);
  const quote = await readFile(new URL("teklif.html", root), "utf8");
  const thanks = await readFile(new URL("tesekkurler.html", root), "utf8");
  const questions = await readFile(new URL("sorular.html", root), "utf8");
  const tracking = await readFile(new URL("assets/js/tracking.js", root), "utf8");

  assert.match(quote, /minifabrika-api\.oz-cht-t\.workers\.dev\/quote/);
  assert.match(quote, /accept="\.stl,\.3mf,\.obj,\.zip"/);
  assert.doesNotMatch(quote, /formsubmit\.co/i);
  assert.match(thanks, /URLSearchParams\(location\.search\)\.get\('quote'\)/);
  assert.match(questions, /formsubmit\.co\/info@minifabrika\.com/i);
  assert.match(tracking, /formsubmit\.co\/info@minifabrika\.com/i);
});

test("a quote without a file is accepted and does not write to R2", async () => {
  const events = [];
  const db = createDb(events);
  const files = {
    async put() {
      events.push("r2:put");
    },
  };
  const sent = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    sent.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ id: "mail_test" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const response = await worker.fetch(
      new Request("https://worker.example/quote", {
        method: "POST",
        headers: { Origin: "https://minifabrika.com" },
        body: baseForm({ withFile: false }),
      }),
      {
        DB: db,
        FILES: files,
        RESEND_API_KEY: "test",
        MAIL_FROM: "MiniFabrika <info@minifabrika.com>",
        MAIL_TO: "info@minifabrika.com",
      },
    );
    const result = await response.json();
    assert.equal(response.status, 201);
    assert.equal(result.ok, true);
    assert.equal(events.includes("r2:put"), false);
    assert.equal(sent.length, 2);
    const admin = sent.find((mail) => mail.subject.startsWith("Yeni MiniFabrika"));
    assert.equal(admin.attachments, undefined);
    assert.match(admin.html, /Henüz yüklenmedi/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("D1 is written before R2 and email failure still returns success", async () => {
  const events = [];
  const db = createDb(events);
  const files = {
    async put() {
      events.push("r2:put");
    },
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("mail service unavailable");
  };
  try {
    const response = await worker.fetch(
      new Request("https://worker.example/quote", {
        method: "POST",
        headers: { Origin: "https://minifabrika.com" },
        body: baseForm(),
      }),
      {
        DB: db,
        FILES: files,
        RESEND_API_KEY: "test",
        MAIL_FROM: "MiniFabrika <info@minifabrika.com>",
        MAIL_TO: "info@minifabrika.com",
      },
    );
    const result = await response.json();
    assert.equal(response.status, 201);
    assert.equal(result.ok, true);
    assert.equal(result.emailStatus, "failed");
    assert.ok(events.indexOf("d1:insert") < events.indexOf("r2:put"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("small uploaded files are attached to the admin email", async () => {
  const events = [];
  const db = createDb(events);
  const files = { async put() {} };
  const payloads = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    payloads.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ id: "mail_test" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const response = await worker.fetch(
      new Request("https://worker.example/quote", {
        method: "POST",
        headers: { Origin: "https://minifabrika.com" },
        body: baseForm(),
      }),
      {
        DB: db,
        FILES: files,
        RESEND_API_KEY: "test",
        MAIL_FROM: "MiniFabrika <info@minifabrika.com>",
        MAIL_TO: "info@minifabrika.com",
      },
    );
    assert.equal(response.status, 201);
    const admin = payloads.find((mail) => mail.subject.startsWith("Yeni MiniFabrika"));
    assert.equal(admin.attachments.length, 1);
    assert.equal(admin.attachments[0].filename, "test.stl");
    assert.ok(admin.attachments[0].content.length > 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("untrusted browser origins are rejected", async () => {
  const response = await worker.fetch(
    new Request("https://worker.example/quote", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
    }),
    {},
  );
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
});
