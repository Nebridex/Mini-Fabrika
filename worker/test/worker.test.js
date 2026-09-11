import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  MAX_FILE_SIZE,
  createQuoteId,
  sanitizeFileName,
  validateFile,
} from "../src/index.js";
import worker from "../src/index.js";

test("quote identifiers match the public contract", () => {
  assert.match(createQuoteId(new Date("2026-09-11T00:00:00Z")), /^MF-20260911-[A-Z0-9]{5}$/);
});

test("uploaded file names are sanitized and keep an allowed extension", () => {
  assert.equal(sanitizeFileName("../../Müşteri ölçü 01.STL"), "Musteri-olcu-01.stl");
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

test("only the quote form leaves FormSubmit", async () => {
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

test("D1 is written before R2 and email failure still returns success", async () => {
  const events = [];
  const db = {
    prepare(sql) {
      return {
        bind() {
          return {
            async run() {
              events.push(sql.includes("INSERT INTO") ? "d1:insert" : "d1:update");
            },
          };
        },
      };
    },
  };
  const files = {
    async put() {
      events.push("r2:put");
    },
  };
  const form = new FormData();
  form.set("name", "Canlı Test");
  form.set("email", "info@minifabrika.com");
  form.set("production_type", "Adetli parça üretimi");
  form.set("quantity", "10");
  form.set("material", "PLA");
  form.set("sample", "no");
  form.set("use_case", "Otomatik test");
  form.set("consent", "on");
  form.set("attachment", new File(["solid test\nendsolid test\n"], "test.stl", { type: "model/stl" }));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("mail service unavailable");
  };
  try {
    const response = await worker.fetch(
      new Request("https://worker.example/quote", {
        method: "POST",
        headers: { Origin: "https://minifabrika.com" },
        body: form,
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
