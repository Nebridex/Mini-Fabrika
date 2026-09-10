import { createHmac, timingSafeEqual } from 'node:crypto';
import nodemailer from 'nodemailer';
import { config } from './config.js';

const transport = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: { user: config.smtp.user, pass: config.smtp.pass }
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

export function createDownloadToken(requestId, expiresAt) {
  return createHmac('sha256', config.downloadSigningSecret)
    .update(`${requestId}.${expiresAt}`)
    .digest('hex');
}

export function validDownloadToken(requestId, expiresAt, signature) {
  if (!/^\d+$/.test(String(expiresAt)) || Number(expiresAt) < Math.floor(Date.now() / 1000)) return false;
  const expected = createDownloadToken(requestId, expiresAt);
  const actual = String(signature || '');
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function rows(payload) {
  return Object.entries(payload)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `<tr><th align="left" style="padding:6px;border-bottom:1px solid #ddd">${escapeHtml(key)}</th><td style="padding:6px;border-bottom:1px solid #ddd">${escapeHtml(value)}</td></tr>`)
    .join('');
}

export async function sendOutboxEmail(job, request) {
  if (job.kind === 'customer_receipt') {
    return transport.sendMail({
      from: config.mailFrom,
      to: job.recipient,
      replyTo: config.businessEmail,
      subject: `${request.id} numaralı talebinizi aldık`,
      text: `Merhaba ${request.customer_name},\n\n${request.id} numaralı talebinizi aldık. Dosyanız ve bilgileriniz teknik incelemeye alınacaktır. Bu e-postayı yanıtlayarak bize ulaşabilirsiniz.\n\nMiniFabrika`,
      html: `<p>Merhaba ${escapeHtml(request.customer_name)},</p><p><strong>${escapeHtml(request.id)}</strong> numaralı talebinizi aldık. Dosyanız ve bilgileriniz teknik incelemeye alınacaktır.</p><p>Bu e-postayı yanıtlayarak bize ulaşabilirsiniz.</p><p>MiniFabrika</p>`
    });
  }

  const expiresAt = Math.floor(Date.now() / 1000) + config.downloadLinkTtlSeconds;
  const signature = createDownloadToken(request.id, expiresAt);
  const downloadUrl = request.file_key
    ? `${config.publicApiUrl}/v1/files/${encodeURIComponent(request.id)}?exp=${expiresAt}&sig=${signature}`
    : null;
  const fileLine = downloadUrl ? `\nDosya: ${downloadUrl}` : '\nDosya eklenmedi.';
  return transport.sendMail({
    from: config.mailFrom,
    to: job.recipient,
    replyTo: request.customer_email || config.businessEmail,
    subject: `[${request.id}] Yeni MiniFabrika talebi`,
    text: `Talep: ${request.id}\nTür: ${request.request_type}\nMüşteri: ${request.customer_name}\nE-posta: ${request.customer_email || '-'}${fileLine}\n\nDetaylar:\n${JSON.stringify(request.payload, null, 2)}`,
    html: `<h2>Yeni talep: ${escapeHtml(request.id)}</h2><p><strong>Tür:</strong> ${escapeHtml(request.request_type)}<br><strong>Müşteri:</strong> ${escapeHtml(request.customer_name)}<br><strong>E-posta:</strong> ${escapeHtml(request.customer_email || '-')}</p>${downloadUrl ? `<p><a href="${escapeHtml(downloadUrl)}">Dosyayı güvenli bağlantıyla indir</a> (bağlantı süreli)</p>` : '<p>Dosya eklenmedi.</p>'}<table style="border-collapse:collapse">${rows(request.payload)}</table>`
  });
}
