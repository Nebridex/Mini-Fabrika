import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { createPendingRequest, markRequestReceived, markUploadFailed, pool } from './db.js';
import { validateUpload } from './upload-validation.js';
import { storePrivateFile, getPrivateFile } from './storage.js';
import { validDownloadToken } from './email.js';
import { processOutbox, startOutboxWorker } from './outbox.js';

const app = Fastify({ logger: true, trustProxy: config.trustProxy, bodyLimit: config.maxUploadBytes + 1024 * 1024 });

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cors, {
  origin: (origin, callback) => callback(null, !origin || origin === config.appOrigin),
  methods: ['GET', 'POST']
});
await app.register(rateLimit, { max: 12, timeWindow: '15 minutes' });
await app.register(multipart, {
  limits: { files: 1, fileSize: config.maxUploadBytes, fields: 40, parts: 41, fieldNameSize: 100, fieldSize: 10_000 }
});

const requestTypes = new Set(['quote', 'corporate_quote', 'question', 'article_comment']);
const requiredByType = {
  quote: ['name', 'email', 'production_type', 'quantity', 'material', 'use_case', 'consent'],
  corporate_quote: ['full_name', 'company', 'email', 'quantity', 'message'],
  question: ['title', 'category', 'question', 'name'],
  article_comment: ['name', 'comment', 'article_url']
};

function cleanFields(fields) {
  const cleaned = {};
  for (const [key, value] of Object.entries(fields)) {
    cleaned[String(key).slice(0, 100)] = String(value ?? '').trim().slice(0, 10_000);
  }
  return cleaned;
}

function validateFields(fields) {
  const type = fields.request_type;
  if (!requestTypes.has(type)) throw new Error('Geçersiz talep türü.');
  for (const name of requiredByType[type]) {
    if (!fields[name]) throw new Error(`Zorunlu alan eksik: ${name}`);
  }
  if ((fields.name || fields.full_name || '').length > 160) throw new Error('Ad alanı çok uzun.');
  if (fields.email && (fields.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))) throw new Error('Geçerli bir e-posta adresi girin.');
  if (type === 'quote' && (!fields.quantity || Number(fields.quantity) < 2)) throw new Error('Planlanan toplam adet en az 2 olmalıdır.');
  return type;
}

app.get('/health', async () => ({ ok: true }));

app.post('/v1/requests', async (request, reply) => {
  const tempDir = join(tmpdir(), `minifabrika-${randomUUID()}`);
  await mkdir(tempDir, { recursive: true });
  let tempPath = null;
  let originalName = null;
  let requestId = null;
  try {
    const fields = {};
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        if (tempPath) throw new Error('Tek seferde yalnızca bir dosya yükleyebilirsiniz.');
        originalName = part.filename;
        tempPath = join(tempDir, 'upload.bin');
        await pipeline(part.file, createWriteStream(tempPath, { flags: 'wx' }));
        if (part.file.truncated) throw new Error(`Dosya boyutu ${Math.floor(config.maxUploadBytes / 1024 / 1024)} MB sınırını aşıyor.`);
      } else {
        fields[part.fieldname] = part.value;
      }
    }

    const cleaned = cleanFields(fields);
    if (cleaned.website) return reply.code(201).send({ ok: true });
    const requestType = validateFields(cleaned);
    if (requestType === 'quote' && !tempPath) throw new Error('STL, 3MF, OBJ veya ZIP dosyası ekleyin.');
    if (requestType !== 'quote' && tempPath) throw new Error('Bu form dosya yüklemeyi desteklemiyor.');
    const metadata = tempPath ? await validateUpload(tempPath, originalName) : null;
    const customerName = cleaned.name || cleaned.full_name;
    requestId = await createPendingRequest({
      requestType,
      customerName,
      customerEmail: cleaned.email || null,
      payload: cleaned
    });

    let storedFile = null;
    if (tempPath) {
      const key = await storePrivateFile(tempPath, requestId, metadata);
      storedFile = { ...metadata, key };
    }
    await markRequestReceived(requestId, storedFile);
    setImmediate(() => processOutbox().catch((error) => app.log.error(error, 'Outbox processing failed')));
    return reply.code(201).send({ ok: true, requestId });
  } catch (error) {
    if (requestId) await markUploadFailed(requestId, error).catch(() => {});
    request.log.warn({ err: error, requestId }, 'Request submission rejected');
    const status = requestId ? 500 : 400;
    return reply.code(status).send({ ok: false, requestId, message: status === 400 ? error.message : 'Talep kaydedildi ancak dosya işlenemedi. Lütfen talep numarasıyla iletişime geçin.' });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

app.get('/v1/files/:requestId', { config: { rateLimit: { max: 30, timeWindow: '15 minutes' } } }, async (request, reply) => {
  const { requestId } = request.params;
  const { exp, sig } = request.query;
  if (!validDownloadToken(requestId, exp, sig)) return reply.code(403).send({ message: 'İndirme bağlantısı geçersiz veya süresi dolmuş.' });
  const result = await pool.query('SELECT file_key, file_name, file_content_type FROM requests WHERE id = $1 AND status = $2', [requestId, 'received']);
  const record = result.rows[0];
  if (!record?.file_key) return reply.code(404).send({ message: 'Dosya bulunamadı.' });
  const object = await getPrivateFile(record.file_key);
  reply.header('Content-Type', record.file_content_type || 'application/octet-stream');
  reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(record.file_name)}`);
  reply.header('Cache-Control', 'private, no-store');
  return reply.send(object.Body);
});

app.addHook('onClose', async () => pool.end());

if (process.env.NODE_ENV !== 'test') {
  startOutboxWorker();
  await app.listen({ port: config.port, host: '0.0.0.0' });
}

export default app;
