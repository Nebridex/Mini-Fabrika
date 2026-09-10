import { pool } from './db.js';
import { sendOutboxEmail } from './email.js';

let running = false;

async function claimJob() {
  const result = await pool.query(
    `WITH candidate AS (
       SELECT id FROM email_outbox
       WHERE ((status IN ('pending', 'retry') AND next_attempt_at <= now())
          OR (status = 'sending' AND updated_at < now() - interval '10 minutes'))
         AND attempts < 10
       ORDER BY next_attempt_at, id
       FOR UPDATE SKIP LOCKED LIMIT 1
     )
     UPDATE email_outbox o SET status = 'sending', attempts = attempts + 1, updated_at = now()
     FROM candidate WHERE o.id = candidate.id
     RETURNING o.*`
  );
  return result.rows[0];
}

async function finish(job, error) {
  const status = error ? (job.attempts >= 10 ? 'failed' : 'retry') : 'sent';
  const delayMinutes = Math.min(60, 2 ** Math.min(job.attempts, 6));
  await pool.query(
    `UPDATE email_outbox SET status = $2, last_error = $3,
      next_attempt_at = CASE WHEN $2 = 'retry' THEN now() + ($4 * interval '1 minute') ELSE next_attempt_at END,
      updated_at = now() WHERE id = $1`,
    [job.id, status, error ? String(error.message || error).slice(0, 1000) : null, delayMinutes]
  );
  const column = job.kind === 'customer_receipt' ? 'customer_email_status' : 'business_email_status';
  await pool.query(`UPDATE requests SET ${column} = $2, updated_at = now() WHERE id = $1`, [job.request_id, status]);
}

export async function processOutbox() {
  if (running) return;
  running = true;
  try {
    for (let count = 0; count < 20; count += 1) {
      const job = await claimJob();
      if (!job) break;
      const result = await pool.query('SELECT * FROM requests WHERE id = $1', [job.request_id]);
      try {
        await sendOutboxEmail(job, result.rows[0]);
        await finish(job, null);
      } catch (error) {
        await finish(job, error);
      }
    }
  } finally {
    running = false;
  }
}

export function startOutboxWorker() {
  const timer = setInterval(() => processOutbox().catch(() => {}), 30_000);
  timer.unref();
  processOutbox().catch(() => {});
}
