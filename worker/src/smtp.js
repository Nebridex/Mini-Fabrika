import { connect as tlsConnect } from "node:tls";

const DEFAULT_HOST = "smtpout.secureserver.net";
const DEFAULT_PORT = 465;
const RESPONSE_TIMEOUT_MS = 20000;

export async function sendSmtpMail(env, options) {
  if (typeof env.__sendMail === "function") {
    return env.__sendMail(options);
  }

  const config = {
    host: String(env.SMTP_HOST || DEFAULT_HOST),
    port: Number(env.SMTP_PORT || DEFAULT_PORT),
    user: String(env.SMTP_USER || ""),
    password: String(env.SMTP_PASSWORD || ""),
    from: String(env.MAIL_FROM || env.SMTP_USER || ""),
  };

  validateConfig(config);

  const recipients = normalizeRecipients(options.to);
  if (!recipients.length) throw new Error("SMTP recipient missing");

  const message = buildMimeMessage({
    from: config.from,
    to: recipients,
    replyTo: options.replyTo || "",
    subject: options.subject || "MiniFabrika",
    html: options.html || "",
    attachments: options.attachments || [],
  });

  return smtpSubmit(config, recipients, message);
}

async function smtpSubmit(config, recipients, message) {
  let socket;
  try {
    socket = await openTlsSocket(config.host, config.port);
    const reader = createResponseReader(socket);

    await expectCode(reader, [220], "greeting");
    await writeLine(socket, "EHLO minifabrika.com");
    await expectCode(reader, [250], "EHLO");

    await writeLine(socket, "AUTH LOGIN");
    await expectCode(reader, [334], "AUTH LOGIN");
    await writeLine(socket, base64Utf8(config.user));
    await expectCode(reader, [334], "SMTP username");
    await writeLine(socket, base64Utf8(config.password));
    await expectCode(reader, [235], "SMTP password");

    await writeLine(socket, `MAIL FROM:<${sanitizeAddress(config.user)}>`);
    await expectCode(reader, [250], "MAIL FROM");

    for (const recipient of recipients) {
      await writeLine(socket, `RCPT TO:<${sanitizeAddress(recipient)}>`);
      await expectCode(reader, [250, 251], "RCPT TO");
    }

    await writeLine(socket, "DATA");
    await expectCode(reader, [354], "DATA");

    await writeChunk(socket, dotStuff(message) + "\r\n.\r\n");
    const accepted = await expectCode(reader, [250], "message body");

    try {
      await writeLine(socket, "QUIT");
      await expectCode(reader, [221], "QUIT");
    } catch (_) {
      // Message already accepted; QUIT failure should not mark delivery as failed.
    }

    return { ok: true, response: accepted.text };
  } finally {
    if (socket) {
      try { socket.end(); } catch (_) {}
      try { socket.destroy(); } catch (_) {}
    }
  }
}

function openTlsSocket(host, port) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const socket = tlsConnect(
      {
        host,
        port,
        servername: host,
        rejectUnauthorized: true,
      },
      () => {
        if (settled) return;
        settled = true;
        socket.removeListener("error", onError);
        resolve(socket);
      },
    );

    function onError(error) {
      if (settled) return;
      settled = true;
      reject(new Error(`SMTP TLS connection failed: ${safeError(error)}`));
    }

    socket.once("error", onError);
  });
}

function createResponseReader(socket) {
  const decoder = new TextDecoder();
  let buffer = "";
  let responseLines = [];
  let endedError = null;
  const queued = [];
  const waiters = [];

  function settleResponse(response) {
    const waiter = waiters.shift();
    if (waiter) {
      clearTimeout(waiter.timer);
      waiter.resolve(response);
    } else {
      queued.push(response);
    }
  }

  function failAll(error) {
    endedError = error instanceof Error ? error : new Error(String(error || "SMTP socket closed"));
    while (waiters.length) {
      const waiter = waiters.shift();
      clearTimeout(waiter.timer);
      waiter.reject(endedError);
    }
  }

  function processLine(line) {
    if (!line) return;
    responseLines.push(line);
    const match = line.match(/^(\d{3})([ -])/);
    if (match && match[2] === " ") {
      const response = {
        code: Number(match[1]),
        text: responseLines.join("\n"),
      };
      responseLines = [];
      settleResponse(response);
    }
  }

  function flushBuffer() {
    while (true) {
      const index = buffer.indexOf("\r\n");
      if (index === -1) break;
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      processLine(line);
    }
  }

  socket.on("data", (chunk) => {
    buffer += decoder.decode(chunk, { stream: true });
    flushBuffer();
  });
  socket.on("error", (error) => failAll(new Error(`SMTP socket error: ${safeError(error)}`)));
  socket.on("end", () => failAll(new Error("SMTP socket ended unexpectedly")));

  return function nextResponse() {
    if (queued.length) return Promise.resolve(queued.shift());
    if (endedError) return Promise.reject(endedError);

    return new Promise((resolve, reject) => {
      const waiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          const index = waiters.indexOf(waiter);
          if (index >= 0) waiters.splice(index, 1);
          reject(new Error("SMTP response timeout"));
        }, RESPONSE_TIMEOUT_MS),
      };
      waiters.push(waiter);
    });
  };
}

async function expectCode(reader, acceptedCodes, stage) {
  const response = await reader();
  if (!acceptedCodes.includes(response.code)) {
    throw new Error(`SMTP ${stage} failed (${response.code}): ${response.text.slice(0, 300)}`);
  }
  return response;
}

function writeLine(socket, line) {
  return writeChunk(socket, String(line) + "\r\n");
}

function writeChunk(socket, data) {
  return new Promise((resolve, reject) => {
    let drained = false;
    const cleanup = () => {
      socket.removeListener("error", onError);
      socket.removeListener("drain", onDrain);
    };
    const onError = (error) => {
      cleanup();
      reject(new Error(`SMTP write failed: ${safeError(error)}`));
    };
    const onDrain = () => {
      drained = true;
      cleanup();
      resolve();
    };

    socket.once("error", onError);
    const ok = socket.write(data);
    if (ok) {
      cleanup();
      resolve();
      return;
    }
    socket.once("drain", onDrain);

    // Some Workers-compatible sockets do not emit drain for small writes.
    setTimeout(() => {
      if (!drained) {
        cleanup();
        resolve();
      }
    }, 1000);
  });
}

export function buildMimeMessage({ from, to, replyTo, subject, html, attachments = [] }) {
  const recipients = normalizeRecipients(to);
  const headers = [
    `From: ${sanitizeHeader(from)}`,
    `To: ${recipients.map(sanitizeHeader).join(", ")}`,
    replyTo ? `Reply-To: ${sanitizeHeader(replyTo)}` : "",
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@minifabrika.com>`,
    "MIME-Version: 1.0",
  ].filter(Boolean);

  const htmlBody = wrapBase64(base64Utf8(html));

  if (!attachments.length) {
    return normalizeCrlf([
      ...headers,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      htmlBody,
    ].join("\r\n"));
  }

  const boundary = `mf_mixed_${crypto.randomUUID().replace(/-/g, "")}`;
  const parts = [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    htmlBody,
  ];

  for (const attachment of attachments) {
    const filename = sanitizeFilename(attachment.filename || "dosya");
    const type = sanitizeHeader(attachment.contentType || "application/octet-stream");
    const content = wrapBase64(String(attachment.content || "").replace(/\s+/g, ""));
    parts.push(
      `--${boundary}`,
      `Content-Type: ${type}; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      content,
    );
  }

  parts.push(`--${boundary}--`, "");
  return normalizeCrlf(parts.join("\r\n"));
}

function normalizeRecipients(value) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map(sanitizeAddress);
}

function sanitizeAddress(value) {
  const address = String(value || "").trim().replace(/[\r\n]/g, "");
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(address)) {
    throw new Error("Invalid SMTP email address");
  }
  return address;
}

function sanitizeHeader(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim().slice(0, 998);
}

function sanitizeFilename(value) {
  return String(value || "dosya")
    .replace(/[\r\n"]/g, "_")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 160) || "dosya";
}

function encodeHeader(value) {
  const clean = sanitizeHeader(value);
  if (/^[\x20-\x7E]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${base64Utf8(clean)}?=`;
}

function base64Utf8(value) {
  const bytes = new TextEncoder().encode(String(value ?? ""));
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function wrapBase64(value) {
  return String(value || "").match(/.{1,76}/g)?.join("\r\n") || "";
}

function normalizeCrlf(value) {
  return String(value).replace(/\r?\n/g, "\r\n");
}

function dotStuff(value) {
  const normalized = normalizeCrlf(value);
  return normalized
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? "." + line : line))
    .join("\r\n");
}

function validateConfig(config) {
  if (!config.host) throw new Error("SMTP_HOST missing");
  if (!Number.isInteger(config.port) || config.port <= 0 || config.port > 65535) {
    throw new Error("SMTP_PORT invalid");
  }
  sanitizeAddress(config.user);
  if (!config.password) throw new Error("SMTP_PASSWORD missing");
  if (!config.from) throw new Error("MAIL_FROM missing");
}

function safeError(error) {
  if (!error) return "unknown error";
  return String(error.message || error).replace(/[\r\n]+/g, " ").slice(0, 300);
}
