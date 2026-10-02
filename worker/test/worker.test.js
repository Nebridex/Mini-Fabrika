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
          if (sql.includes("CREATE TABLE")) events.push("d1:create");
          else events.push("d1:run");
        },
        bind() {
          return {
            async run() {
              if (sql.includes("INSERT INTO quote_requests")) events.push("d1:quote-insert");
              else if (sql.includes("INSERT INTO contact_messages")) events.push("d1:contact-insert");
              else if (sql.includes("quote_downloads")) events.push("d1:download");
              else events.push("d1:update");
            },
            async first() {
              if (sql.includes("ORDER BY created_at DESC LIMIT 1")) {
                return {
                  id: "MF-20261003-ABCDE",
                  status: "new",
                  email_status: "failed",
                  last_email_error: "customer: SMTP password failed (535): Authentication failed",
                };
              }
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

function createEnv(events = [], sent = [], { mailFails = false } = {}) {
  return {
    DB: createDb(events),
    FILES: {
      async put() {
        events.push("r2:put");
      },
      async get() {
        return null;
      },
    },
    MAIL_FROM: "MiniFabrika <info@minifabrika.com>",
    MAIL_TO: "info@minifabrika.com",
    SMTP_HOST: "smtpout.secureserver.net",
    SMTP_PORT: "465",
    SMTP_USER: "info@minifabrika.com",
    SMTP_PASSWORD: "test-secret",
    async __sendMail(options) {
      if (mailFails) throw new Error("mail service unavailable");
      sent.push(options);
      return { ok: true };
    },
  };
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
  assert.equal(EMAIL_ATTACHMENT_LIMIT, 2 * 1024 * 1024);
});

test("all public forms use the first-party Worker, not FormSubmit", async () => {
  const root = new URL("../../", import.meta.url);
  const quote = await readFile(new URL("teklif.html", root), "utf8");
  const questions = await readFile(new URL("sorular.html", root), "utf8");
  const tracking = await readFile(new URL("assets/js/tracking.js", root), "utf8");
  const quoteJs = await readFile(new URL("assets/js/quote-form.js", root), "utf8");
  const corporate = await readFile(new URL("kurumsal/index.html", root), "utf8");

  assert.match(quote, /minifabrika-api\.oz-cht-t\.workers\.dev\/quote/);
  assert.match(quote, /accept="\.stl,\.3mf,\.obj,\.zip"/);
  assert.doesNotMatch(quote, /name="attachment"[^>]*required/);
  assert.match(questions, /minifabrika-api\.oz-cht-t\.workers\.dev\/message/);
  assert.match(questions, /data-contact-form/);
  assert.match(tracking, /minifabrika-api\.oz-cht-t\.workers\.dev\/message/);
  assert.match(corporate, /minifabrika-api\.oz-cht-t\.workers\.dev\/message/);
  assert.match(corporate, /message_type" value="corporate"/);

  for (const source of [quote, questions, tracking, quoteJs, corporate]) {
    assert.doesNotMatch(source, /formsubmit\.co/i);
    assert.doesNotMatch(source, /resend/i);
  }
});

test("a quote without a file is accepted, stored and sends two SMTP messages", async () => {
  const events = [];
  const sent = [];
  const env = createEnv(events, sent);

  const response = await worker.fetch(
    new Request("https://worker.example/quote", {
      method: "POST",
      headers: { Origin: "https://minifabrika.com" },
      body: baseForm({ withFile: false }),
    }),
    env,
  );

  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.ok, true);
  assert.equal(result.emailStatus, "sent");
  assert.equal(events.includes("r2:put"), false);
  assert.ok(events.includes("d1:quote-insert"));
  assert.equal(sent.length, 2);

  const admin = sent.find((mail) => mail.subject.startsWith("Yeni MiniFabrika"));
  assert.deepEqual(admin.attachments || [], []);
  assert.equal(admin.replyTo, "info@minifabrika.com");
  assert.match(admin.html, /Henüz yüklenmedi/);
});

test("D1 is written before R2 and email failure still returns success", async () => {
  const events = [];
  const sent = [];
  const env = createEnv(events, sent, { mailFails: true });

  const response = await worker.fetch(
    new Request("https://worker.example/quote", {
      method: "POST",
      headers: { Origin: "https://minifabrika.com" },
      body: baseForm(),
    }),
    env,
  );

  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.ok, true);
  assert.equal(result.emailStatus, "failed");
  assert.ok(events.indexOf("d1:quote-insert") < events.indexOf("r2:put"));
});

test("small uploaded files are attached to the admin SMTP email", async () => {
  const events = [];
  const sent = [];
  const env = createEnv(events, sent);

  const response = await worker.fetch(
    new Request("https://worker.example/quote", {
      method: "POST",
      headers: { Origin: "https://minifabrika.com" },
      body: baseForm(),
    }),
    env,
  );

  assert.equal(response.status, 201);
  const admin = sent.find((mail) => mail.subject.startsWith("Yeni MiniFabrika"));
  assert.equal(admin.attachments.length, 1);
  assert.equal(admin.attachments[0].filename, "test.stl");
  assert.equal(admin.attachments[0].contentType, "model/stl");
  assert.ok(admin.attachments[0].content.length > 0);
});

test("question form stores the message and sends one SMTP notification", async () => {
  const events = [];
  const sent = [];
  const env = createEnv(events, sent);
  const form = new FormData();
  form.set("message_type", "question");
  form.set("title", "PETG dış ortamda kullanılır mı?");
  form.set("category", "Malzeme");
  form.set("question", "Uzun süre güneşte kalacak.");
  form.set("name", "Cihat");
  form.set("email", "test@example.com");

  const response = await worker.fetch(
    new Request("https://worker.example/message", {
      method: "POST",
      headers: { Origin: "https://minifabrika.com" },
      body: form,
    }),
    env,
  );

  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.ok, true);
  assert.equal(result.emailStatus, "sent");
  assert.ok(events.includes("d1:contact-insert"));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].replyTo, "test@example.com");
  assert.match(sent[0].subject, /yeni üretim sorusu/i);
});

test("article comments use the same first-party message endpoint", async () => {
  const sent = [];
  const env = createEnv([], sent);
  const form = new FormData();
  form.set("message_type", "article_comment");
  form.set("comment", "Faydalı bir yazı.");
  form.set("name", "Test");
  form.set("article_url", "https://minifabrika.com/blog/test.html");

  const response = await worker.fetch(
    new Request("https://worker.example/message", {
      method: "POST",
      headers: { Origin: "https://www.minifabrika.com" },
      body: form,
    }),
    env,
  );

  assert.equal(response.status, 201);
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /makale yorumu/i);
});

test("corporate form uses the same first-party message endpoint", async () => {
  const sent = [];
  const env = createEnv([], sent);
  const form = new FormData();
  form.set("message_type", "corporate");
  form.set("full_name", "Satınalma Test");
  form.set("company", "MiniFabrika Test A.Ş.");
  form.set("email", "buyer@example.com");
  form.set("quantity", "50 adet");
  form.set("message", "Fonksiyonel aparat üretimi");

  const response = await worker.fetch(
    new Request("https://worker.example/message", {
      method: "POST",
      headers: { Origin: "https://minifabrika.com" },
      body: form,
    }),
    env,
  );

  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.ok, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].replyTo, "buyer@example.com");
  assert.match(sent[0].subject, /kurumsal talep/i);
  assert.match(sent[0].html, /MiniFabrika Test A\.Ş\./);
  assert.match(sent[0].html, /50 adet/);
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
