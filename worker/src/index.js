const MAX_FILE_SIZE = 50 * 1024 * 1024;
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
        { ok: true, service: "minifabrika-api", time: new Date().toISOString() },
        200,
        corsHeaders,
      );
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

    const file = form.get("attachment");
    const fileError = await validateFile(file);
    if (fileError) {
      const status = file instanceof File && file.size > MAX_FILE_SIZE ? 413 : 400;
      return json({ ok: false, error: fileError }, status, corsHeaders);
    }

    const now = new Date();
    const createdAt = now.toISOString();
    quoteId = createQuoteId(now);
    const extension = getExtension(file.name);
    const safeFileName = sanitizeFileName(file.name);
    const fileKey = createFileKey(now, quoteId, safeFileName);

    await insertQuote(env.DB, {
      quoteId,
      createdAt,
      fields,
      fileName: safeFileName,
      fileKey,
      fileSize: file.size,
      fileType: extension,
    });

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

    await updateStatus(env.DB, quoteId, "new");

    const [customerResult, adminResult] = await Promise.allSettled([
      sendResend(env, {
        to: [fields.email],
        replyTo: env.MAIL_TO,
        subject: `MiniFabrika üretim talebinizi aldık — ${quoteId}`,
        html: customerEmailHtml({ quoteId, ...fields }),
      }),
      sendResend(env, {
        to: [env.MAIL_TO],
        replyTo: fields.email,
        subject: `Yeni MiniFabrika üretim talebi — ${quoteId}`,
        html: adminEmailHtml({
          quoteId,
          createdAt,
          ...fields,
          fileName: safeFileName,
          fileSize: file.size,
          fileKey,
        }),
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
  if (!(file instanceof File) || !file.name || file.size === 0) return "Dosya yüklenmesi gerekiyor.";
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
      ?, ?, ?, 'uploading', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `)
    .bind(
      data.quoteId,
      data.createdAt,
      data.createdAt,
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
      data.fileName,
      data.fileKey,
      data.fileSize,
      data.fileType,
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

async function sendResend(env, options) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: options.to,
      reply_to: options.replyTo,
      subject: options.subject,
      html: options.html,
    }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Resend ${response.status}: ${body.slice(0, 1000)}`);
  return body ? JSON.parse(body) : {};
}

function customerEmailHtml(data) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:auto;color:#172033;line-height:1.6">
    <h2>Üretim talebinizi aldık.</h2>
    <p>Merhaba ${escapeHtml(data.name)},</p>
    <p>MiniFabrika üretim talebiniz başarıyla alındı. Gönderdiğiniz dosya ve üretim bilgileri teknik olarak incelenecek.</p>
    <div style="background:#f5f7fa;border-radius:12px;padding:18px;margin:24px 0">
      <strong>Talep No:</strong> ${escapeHtml(data.quoteId)}<br>
      <strong>Üretim türü:</strong> ${escapeHtml(data.productionType)}<br>
      <strong>Planlanan adet:</strong> ${data.quantity}<br>
      <strong>Malzeme:</strong> ${escapeHtml(data.material)}<br>
      ${data.sampleCount ? `<strong>Numune:</strong> ${data.sampleCount} adet<br>` : ""}
    </div>
    <p>Teknik inceleme sonrasında fiyat, üretim süresi ve gerekiyorsa numune önerisiyle dönüş yapacağız.</p>
    <p>Ek bilgi paylaşmak isterseniz bu e-postayı doğrudan yanıtlayabilirsiniz.</p>
    <p><strong>MiniFabrika</strong><br>Adetli 3D baskı üretimi<br>info@minifabrika.com</p>
  </div>`;
}

function adminEmailHtml(data) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:auto;color:#172033;line-height:1.55">
    <h2>Yeni üretim talebi</h2>
    <p><strong>Talep No:</strong> ${escapeHtml(data.quoteId)}</p>
    <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;border:1px solid #ddd">
      ${row("Tarih", data.createdAt)}${row("Ad Soyad", data.name)}${row("Firma", data.company || "-")}
      ${row("E-posta", data.email)}${row("Telefon", data.phone || "-")}${row("Üretim türü", data.productionType)}
      ${row("Adet", String(data.quantity))}${row("Malzeme", data.material)}
      ${row("Numune", data.sampleCount ? `${data.sampleCount} adet` : "İstenmiyor")}
      ${row("Hedef tarih", data.targetDate || "-")}${row("Dosya", data.fileName)}
      ${row("Dosya boyutu", formatBytes(data.fileSize))}${row("R2 anahtarı", data.fileKey)}
    </table>
    <h3 style="margin-top:28px">Kullanım amacı / teknik not</h3>
    <div style="background:#f5f7fa;border-radius:10px;padding:16px">${escapeHtml(data.useCase).replace(/\n/g, "<br>")}</div>
    <p style="margin-top:24px">Dosya Cloudflare R2 içerisinde özel olarak saklanmıştır.</p>
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
  MAX_FILE_SIZE,
  createFileKey,
  createQuoteId,
  getExtension,
  sanitizeFileName,
  validateFields,
  validateFile,
};
