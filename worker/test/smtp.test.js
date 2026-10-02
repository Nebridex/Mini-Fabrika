import assert from "node:assert/strict";
import test from "node:test";
import { buildMimeMessage, sendSmtpMail } from "../src/smtp.js";

test("MIME builder includes HTML, reply-to and attachment", () => {
  const message = buildMimeMessage({
    from: "MiniFabrika <info@minifabrika.com>",
    to: ["info@minifabrika.com"],
    replyTo: "customer@example.com",
    subject: "Yeni üretim talebi — MF-20261003-ABCDE",
    html: "<h1>Talep</h1><p>Merhaba</p>",
    attachments: [
      {
        filename: "model.stl",
        contentType: "model/stl",
        content: "c29saWQgdGVzdA==",
      },
    ],
  });

  assert.match(message, /From: MiniFabrika <info@minifabrika\.com>/);
  assert.match(message, /Reply-To: customer@example\.com/);
  assert.match(message, /multipart\/mixed/);
  assert.match(message, /filename="model\.stl"/);
  assert.match(message, /Content-Type: model\/stl/);
  assert.match(message, /c29saWQgdGVzdA==/);
  assert.match(message, /Subject: =\?UTF-8\?B\?/);
});

test("SMTP transport exposes a test hook without opening a network connection", async () => {
  const sent = [];
  const result = await sendSmtpMail(
    {
      async __sendMail(options) {
        sent.push(options);
        return { ok: true, mocked: true };
      },
    },
    {
      to: ["customer@example.com"],
      replyTo: "info@minifabrika.com",
      subject: "Test",
      html: "<p>Test</p>",
    },
  );

  assert.equal(result.mocked, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to[0], "customer@example.com");
});

test("SMTP transport never needs a Resend credential", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/smtp.js", import.meta.url), "utf8")
  );
  assert.doesNotMatch(source, /resend/i);
  assert.match(source, /SMTP_PASSWORD/);
  assert.match(source, /smtpout\.secureserver\.net/);
});
