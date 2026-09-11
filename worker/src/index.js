const MAX_FILE_SIZE = 50 * 1024 * 1024;
const EMAIL_ATTACHMENT_LIMIT = 20 * 1024 * 1024;
const DOWNLOAD_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const ALLOWED_EXTENSIONS = new Set(["stl", "3mf", "obj", "zip"]);
const ALLOWED_ORIGINS = new Set([
  "https://minifabrika.com",
  "https://www.minifabrika.com",
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = cors(origin);

    if (request.method === "OPTIONS") {
      if (!ALLOWED_ORIGINS.has(origin)) {
        return json({ ok: false, error: "Origin not allowed" }, 403);
      }
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json(
        { ok: true, service: "minifabrika-api", version: "optional-files-v1", time: new Date().toISOString() },
        200,
        corsHeaders,
      );
    }

    if (request.method === "GET" && url.pathname.startsWith("/download/")) {
      return handleDownload(request, env);
    }

    if (request.method !== "POST" || url.pathname !== "/quote") {
      return json({ ok: false, error: "Not found" }, 404, corsHeaders);
    }
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ ok: false, error: "Origin not allowed" }, 403);
    }

    return handleQuote(request, env, corsHeaders);
  },
};

async function handleQuote(request, env, corsHeaders) {
  let quoteId = null;
  try {
    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return json({ ok: false, error: "multipart/form-data gerekli." }, 400, corsHeaders);
    }

    const form = await request.formData();
    if (clean(form.get("website"), 200)) {
      return json(
        { ok: true, quoteId: createQuoteId(new Date()), emailStatus: "skipped" },
        201,
        corsHeaders,
      );
    }

    const fields = readFields(form);
    const validationError = validateFields(fields);
    if (validationError) return json({ ok: false, error: validationError }, 400, corsHeaders);

    const rawFile = form.get("attachment");
    const hasFile = rawFile instanceof File && Boolean(rawFile.name) && rawFile.size > 0;
    const file = hasFile ? rawFile : null;

    if (file) {
      const fileError = await validateFile(file);
      if (fileError) {
        const status = file.size > MAX_FILE_SIZE ? 413 : 400;
        return json({ ok: false, error: fileError }, status, corsHeaders);
      }
    }

    const now = new Date();
    const createdAt = now.toISOString();
    quoteId = createQuoteId(now);

    const extension = file ? getExtension(file.name) : "";
    const safeFileName = file ? sanitizeFileName(file.name) : "";
    const fileKey = file ? createFileKey(now, quoteId, safeFileName) : "";
    let downloadUrl = "";
    let attachmentIncluded = false;

    await insertQuote(env.DB, {
      quoteId,
      createdAt,
      fields,
      status: file ? "uploading" : "new",
      fileName: safeFileName,
      fileKey,
      fileSize: file ? file.size : 0,
      fileType: extension,
    });

    if (file) {
      try {
        await env.FILES.put(fileKey, file.stream(), {
          httpMetadata: { contentType: file.type || contentTypeFor(extension) },
          customMetadata: { quoteId, fileName: safeFileName },
        });
      } catch (uploadError) {
        console.error("quote_upload_error", quoteId, uploadError);
        await updateStatus(env.DB, quoteId, "upload_failed");
        return json(
          {
            ok: false,
            quoteId,
            error: `Talebiniz ${quoteId} numarasıyla kaydedildi ancak dosya yüklenemedi. Lütfen tekrar deneyin veya bizimle iletişime geçin.`,
          },
          500,
          corsHeaders,
        );
      }

      try {
        const token = randomDownloadToken();
        const expiresAt = new Date(Date.now() + DOWNLOAD_TTL_MS).toISOString();
        await ensureDownloadTable(env.DB);
        await env.DB.prepare(
          "INSERT OR REPLACE INTO quote_downloads (quote_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)",
        )
          .bind(quoteId, token, expiresAt, createdAt)
          .run();
        downloadUrl = buildDownloadUrl(request, quoteId, token);
      } catch (downloadLinkError) {
        console.error("quote_download_link_error", quoteId, downloadLinkError);
      }

      await updateStatus(env.DB, quoteId, "new");
    }

    let adminAttachments = [];
    if (file && file.size <= EMAIL_ATTACHMENT_LIMIT) {
      try {
        adminAttachments = [
          {
            content: arrayBufferToBase64(await file.arrayBuffer()),
            filename: safeFileName,
          },
        ];
        attachmentIncluded = true;
      } catch (attachmentError) {
        console.error("quote_attachment_encode_error", quoteId, attachmentError);
      }
    }

    const [customerResult, adminResult] = await Promise.allSettled([
      sendResend(env, {
        to: [fields.email],
        replyTo: env.MAIL_TO,
        subject: `MiniFabrika üretim talebinizi aldık — ${quoteId}`,
        html: customerEmailHtml({ quoteId, ...fields, hasFile }),
      }),
      sendResend(env, {
        to: [env.MAIL_TO],
        replyTo: fields.email,
        subject: `Yeni MiniFabrika üretim talebi — ${quoteId}`,
        html: adminEmailHtml({
          quoteId,
          createdAt,
          ...fields,
          hasFile,
          fileName: safeFileName,
          fileSize: file ? file.size : 0,
          fileKey,
          downloadUrl,
          attachmentIncluded,
        }),
        attachments: adminAttachments,
      }),
    ]);

    const customerOk = customerResult.status === "fulfilled";
    const adminOk = adminResult.status === "fulfilled";
    const emailStatus = customerOk && adminOk ? "sent" : customerOk || adminOk ? "partial" : "failed";
    const emailErrors = [];
    if (!customerOk) emailErrors.push(`customer: ${errorMessage(customerResult.reason)}`);
    if (!adminOk) emailErrors.push(`admin: ${errorMessage(adminResult.reason)}`);

    try {
      await env.DB.prepare(`
        UPDATE quote_requests
        SET email_status = ?, customer_email_sent_at = ?, admin_email_sent_at = ?,
            last_email_error = ?, updated_at = ?
        WHERE id = ?
      `)
        .bind(
          emailStatus,
          customerOk ? new Date().toISOString() : null,
          adminOk ? new Date().toISOString() : null,
          emailErrors.length ? emailErrors.join(" | ").slice(0, 3000) : null,
          new Date().toISOString(),
          quoteId,
        )
        .run();
    } catch (statusError) {
      console.error("quote_email_status_update_error", quoteId, statusError);
    }

    return json(
      { ok: true, quoteId, emailStatus, message: "Üretim talebiniz alındı." },
      201,
      corsHeaders,
    );
  } catch (error) {
    console.error("quote_submit_error", quoteId, error);
    return json(
      {
        ok: false,
        quoteId,
        error: quoteId
          ? `Talep işlenirken bir sorun oluştu. Talep numaranız: ${quoteId}`
          : "Talep şu anda işlenemedi. Lütfen tekrar deneyin.",
      },
      500,
      corsHeaders,
    );
  }
}

async function handleDownload(request, env) {
  try {
    const url = new URL(request.url);
    const quoteId = decodeURIComponent(url.pathname.slice("/download/".length));
    const token = url.searchParams.get("token") || "";

    if (!/^MF-\d{8}-[A-Z0-9]{5}$/.test(quoteId) || token.length < 20) {
      return json({ ok: false, error: "Geçersiz indirme bağlantısı." }, 400);
    }

    await ensureDownloadTable(env.DB);
    const row = await env.DB.prepare(`
      SELECT d.token, d.expires_at, q.file_key, q.file_name, q.file_type
      FROM quote_downloads d
      JOIN quote_requests q ON q.id = d.quote_id
      WHERE d.quote_id = ?
    `)
      .bind(quoteId)
      .first();

    if (!row || row.token !== token) {
      return json({ ok: false, error: "İndirme bağlantısı bulunamadı." }, 404);
    }
    if (Date.parse(row.expires_at) < Date.now()) {
      return json({ ok: false, error: "Bu indirme bağlantısının süresi dolmuş." }, 410);
    }
    if (!row.file_key) {
      return json({ ok: false, error: "Bu talepte dosya bulunmuyor." }, 404);
    }

    const object = await env.FILES.get(row.file_key);
    if (!object) return json({ ok: false, error: "Dosya bulunamadı." }, 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", headers.get("Content-Type") || contentTypeFor(row.file_type));
    headers.set("Content-Disposition", `attachment; filename="${sanitizeHeaderFilename(row.file_name)}"`);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(object.body, { status: 200, headers });
  } catch (error) {
    console.error("quote_download_error", error);
    return json({ ok: false, error: "Dosya indirilemedi." }, 500);
  }
}

function readFields(form) {
  const sampleRaw = clean(form.get("sample"), 10);
  return {
    name: clean(form.get("name"), 160),
    company: clean(form.get("company"), 200),
    email: clean(form.get("email"), 254).toLowerCase(),
    phone: clean(form.get("phone"), 80),
    productionType: clean(form.get("production_type"), 200),
    quantity: Number(form.get("quantity")),
    material: clean(form.get("material"), 100),
    sampleCount: sampleRaw === "no" || !sampleRaw ? 0 : Number(sampleRaw),
    useCase: clean(form.get("use_case"), 5000),
    targetDate: clean(form.get("target_date"), 20),
    consent: form.get("consent") ? 1 : 0,
    leadSource: clean(form.get("lead_source"), 500),
    leadMedium: clean(form.get("lead_medium"), 500),
    leadCampaign: clean(form.get("lead_campaign"), 500),
    leadLandingPage: clean(form.get("lead_landing_page"), 1000),
    leadReferrerHost: clean(form.get("lead_referrer_host"), 500),
    leadGclid: clean(form.get("lead_gclid"), 500),
  };
}

function validateFields(fields) {
  if (!fields.name || !fields.email || !fields.productionType || !fields.material || !fields.useCase || !fields.consent) {
    return "Zorunlu alanlar eksik.";
  }
  if (!isValidEmail(fields.email)) return "Geçerli bir e-posta adresi girin.";
  if (!Number.isInteger(fields.quantity) || fields.quantity < 2 || fields.quantity > 1_000_000) {
    return "Planlanan toplam adet 2 ile 1.000.000 arasında olmalıdır.";
  }
  if (!Number.isInteger(fields.sampleCount) || fields.sampleCount < 0 || fields.sampleCount > 3) {
    return "Numune adedi geçersiz.";
  }
  if (fields.targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(fields.targetDate)) {
    return "Hedef teslim tarihi geçersiz.";
  }
  return null;
}

async function validateFile(file) {
  if (!(file instanceof File) || !file.name || file.size === 0) return null;
  if (file.size > MAX_FILE_SIZE) return "Dosya boyutu en fazla 50 MB olabilir.";
  const extension = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(extension)) return "Yalnızca STL, 3MF, OBJ veya ZIP dosyaları kabul edilir.";
  if (extension === "zip" || extension === "3mf") {
    const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const isZip = signature[0] === 0x50 && signature[1] === 0x4b && [0x03, 0x05, 0x07].includes(signature[2]);
    if (!isZip) return `${extension.toUpperCase()} dosyası geçerli bir ZIP kapsayıcısı değil.`;
  }
  return null;
}

async function insertQuote(db, data) {
  const { fields } = data;
  await db.prepare(`
    INSERT INTO quote_requests (
      id, created_at, updated_at, status, email_status,
      name, company, email, phone, production_type, quantity, material,
      sample_count, use_case, target_date, file_name, file_key, file_size,
      file_type, lead_source, lead_medium, lead_campaign, lead_landing_page,
      lead_referrer_host, lead_gclid, consent
    ) VALUES (
      ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `)
    .bind(
      data.quoteId,
      data.createdAt,
      data.createdAt,
      data.status,
      fields.name,
      fields.company || null,
      fields.email,
      fields.phone || null,
      fields.productionType,
      fields.quantity,
      fields.material,
      fields.sampleCount,
      fields.useCase,
      fields.targetDate || null,
      data.fileName || "",
      data.fileKey || "",
      data.fileSize || 0,
      data.fileType || "",
      fields.leadSource || null,
      fields.leadMedium || null,
      fields.leadCampaign || null,
      fields.leadLandingPage || null,
      fields.leadReferrerHost || null,
      fields.leadGclid || null,
      fields.consent,
    )
    .run();
}

async function updateStatus(db, quoteId, status) {
  try {
    await db.prepare("UPDATE quote_requests SET status = ?, updated_at = ? WHERE id = ?")
      .bind(status, new Date().toISOString(), quoteId)
      .run();
  } catch (error) {
    console.error("quote_status_update_error", quoteId, status, error);
  }
}

async function ensureDownloadTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS quote_downloads (
      quote_id TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();
}

function cors(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function clean(value, maxLength = 5000) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, maxLength);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getExtension(filename) {
  const parts = String(filename).toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function sanitizeFileName(filename) {
  const extension = getExtension(filename);
  let base = String(filename)
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 100);
  if (!base) base = "model";
  return `${base}.${extension}`;
}

function sanitizeHeaderFilename(filename) {
  return String(filename || "dosya")
    .replace(/[\r\n"]/g, "_")
    .slice(0, 160);
}

function createQuoteId(date) {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const random = crypto.getRandomValues(new Uint32Array(1))[0]
    .toString(36)
    .toUpperCase()
    .padStart(5, "0")
    .slice(0, 5);
  return `MF-${yyyy}${mm}${dd}-${random}`;
}

function createFileKey(date, quoteId, fileName) {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}/${month}/${day}/${quoteId}/${fileName}`;
}

function contentTypeFor(extension) {
  return {
    stl: "model/stl",
    "3mf": "model/3mf",
    obj: "model/obj",
    zip: "application/zip",
  }[extension] || "application/octet-stream";
}

function randomDownloadToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function buildDownloadUrl(request, quoteId, token) {
  const base = new URL(request.url).origin;
  return `${base}/download/${encodeURIComponent(quoteId)}?token=${encodeURIComponent(token)}`;
}

function arrayBufferToBase64(buffer) {
  return bytesToBase64(new Uint8Array(buffer));
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function sendResend(env, options) {
  const payload = {
    from: env.MAIL_FROM,
    to: options.to,
    reply_to: options.replyTo,
    subject: options.subject,
    html: options.html,
  };
  if (options.attachments && options.attachments.length) {
    payload.attachments = options.attachments;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Resend ${response.status}: ${body.slice(0, 1000)}`);
  return body ? JSON.parse(body) : {};
}

function customerEmailHtml(data) {
  const fileNote = data.hasFile
    ? "Gönderdiğiniz dosya ve üretim bilgileri teknik olarak incelenecek."
    : "Üretim bilgileriniz teknik olarak incelenecek. Dosyanız henüz hazır değilse sorun değil; bu e-postayı yanıtlayarak daha sonra iletebilirsiniz.";
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:auto;color:#172033;line-height:1.6">
    <h2>Üretim talebinizi aldık.</h2>
    <p>Merhaba ${escapeHtml(data.name)},</p>
    <p>MiniFabrika üretim talebiniz başarıyla alındı. ${fileNote}</p>
    <div style="background:#f5f7fa;border-radius:12px;padding:18px;margin:24px 0">
      <strong>Talep No:</strong> ${escapeHtml(data.quoteId)}<br>
      <strong>Üretim türü:</strong> ${escapeHtml(data.productionType)}<br>
      <strong>Planlanan adet:</strong> ${data.quantity}<br>
      <strong>Malzeme:</strong> ${escapeHtml(data.material)}<br>
      ${data.sampleCount ? `<strong>Numune:</strong> ${data.sampleCount} adet<br>` : ""}
    </div>
    <p>Teknik inceleme sonrasında fiyat, üretim süresi ve gerekiyorsa numune önerisiyle dönüş yapacağız.</p>
    <p>Ek bilgi veya dosya paylaşmak isterseniz bu e-postayı doğrudan yanıtlayabilirsiniz.</p>
    <p><strong>MiniFabrika</strong><br>Adetli 3D baskı üretimi<br>info@minifabrika.com</p>
  </div>`;
}

function adminEmailHtml(data) {
  const fileRows = data.hasFile
    ? `${row("Dosya", data.fileName)}${row("Dosya boyutu", formatBytes(data.fileSize))}${row("R2 anahtarı", data.fileKey)}`
    : row("Dosya", "Henüz yüklenmedi");
  const downloadBlock = data.downloadUrl
    ? `<div style="margin:24px 0">
        <a href="${escapeHtml(data.downloadUrl)}" style="display:inline-block;background:#0b7a75;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Dosyayı İndir</a>
        <div style="font-size:12px;color:#667085;margin-top:8px">Güvenli indirme bağlantısı 365 gün geçerlidir.</div>
      </div>`
    : "";
  const attachmentNote = data.attachmentIncluded
    ? "<p><strong>Dosya ayrıca bu e-postaya eklenmiştir.</strong></p>"
    : data.hasFile
      ? "<p>Dosya 20 MB üzerindeyse e-posta eki yapılmaz; yukarıdaki güvenli indirme bağlantısını kullanın.</p>"
      : "<p>Müşteri ilk talepte dosya yüklemedi. Bu e-postayı yanıtlayarak müşteriden dosyayı isteyebilirsiniz.</p>";

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:auto;color:#172033;line-height:1.55">
    <h2>Yeni üretim talebi</h2>
    <p><strong>Talep No:</strong> ${escapeHtml(data.quoteId)}</p>
    <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;border:1px solid #ddd">
      ${row("Tarih", data.createdAt)}${row("Ad Soyad", data.name)}${row("Firma", data.company || "-")}
      ${row("E-posta", data.email)}${row("Telefon", data.phone || "-")}${row("Üretim türü", data.productionType)}
      ${row("Adet", String(data.quantity))}${row("Malzeme", data.material)}
      ${row("Numune", data.sampleCount ? `${data.sampleCount} adet` : "İstenmiyor")}
      ${row("Hedef tarih", data.targetDate || "-")}${fileRows}
    </table>
    ${downloadBlock}
    ${attachmentNote}
    <h3 style="margin-top:28px">Kullanım amacı / teknik not</h3>
    <div style="background:#f5f7fa;border-radius:10px;padding:16px">${escapeHtml(data.useCase).replace(/\n/g, "<br>")}</div>
  </div>`;
}

function row(label, value) {
  return `<tr><td style="border-bottom:1px solid #ddd;width:180px"><strong>${escapeHtml(label)}</strong></td><td style="border-bottom:1px solid #ddd">${escapeHtml(value)}</td></tr>`;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function errorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error || "Unknown error");
}

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

export {
  EMAIL_ATTACHMENT_LIMIT,
  MAX_FILE_SIZE,
  arrayBufferToBase64,
  createFileKey,
  createQuoteId,
  getExtension,
  sanitizeFileName,
  validateFields,
  validateFile,
};
