import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  max: 10
});

export function istanbulDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function createPendingRequest({ requestType, customerName, customerEmail, payload }) {
  const client = await pool.connect();
  const day = istanbulDay();
  try {
    await client.query('BEGIN');
    const sequence = await client.query(
      `INSERT INTO request_daily_sequences (request_day, last_value)
       VALUES ($1, 1)
       ON CONFLICT (request_day) DO UPDATE
         SET last_value = request_daily_sequences.last_value + 1
       RETURNING last_value`,
      [day]
    );
    const value = sequence.rows[0].last_value;
    if (value > 999) throw new Error('Daily request ID capacity exceeded');
    const id = `MF-${day.replaceAll('-', '')}-${String(value).padStart(3, '0')}`;
    await client.query(
      `INSERT INTO requests (id, request_type, customer_name, customer_email, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [id, requestType, customerName, customerEmail || null, JSON.stringify(payload)]
    );
    await client.query('COMMIT');
    return id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function markRequestReceived(id, file) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE requests SET status = 'received', file_key = $2, file_name = $3,
        file_extension = $4, file_content_type = $5, file_size = $6,
        file_sha256 = $7, updated_at = now() WHERE id = $1`,
      [id, file?.key || null, file?.name || null, file?.extension || null,
        file?.contentType || null, file?.size || null, file?.sha256 || null]
    );
    const row = await client.query('SELECT * FROM requests WHERE id = $1', [id]);
    const request = row.rows[0];
    const jobs = [
      ['business_notification', config.businessEmail]
    ];
    if (request.customer_email) jobs.push(['customer_receipt', request.customer_email]);
    for (const [kind, recipient] of jobs) {
      await client.query(
        `INSERT INTO email_outbox (request_id, kind, recipient)
         VALUES ($1, $2, $3) ON CONFLICT (request_id, kind) DO NOTHING`,
        [id, kind, recipient]
      );
    }
    await client.query(
      `UPDATE requests SET customer_email_status = $2, business_email_status = 'queued'
       WHERE id = $1`,
      [id, request.customer_email ? 'queued' : 'not_queued']
    );
    await client.query('COMMIT');
    return request;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function markUploadFailed(id, error) {
  await pool.query(
    `UPDATE requests SET status = 'upload_failed', upload_error = $2, updated_at = now() WHERE id = $1`,
    [id, String(error?.message || error).slice(0, 1000)]
  );
}
