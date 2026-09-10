CREATE TABLE IF NOT EXISTS request_daily_sequences (
  request_day date PRIMARY KEY,
  last_value integer NOT NULL CHECK (last_value BETWEEN 1 AND 999)
);

CREATE TABLE IF NOT EXISTS requests (
  id text PRIMARY KEY,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'upload_pending',
  customer_name text NOT NULL,
  customer_email text,
  payload jsonb NOT NULL,
  file_key text,
  file_name text,
  file_extension text,
  file_content_type text,
  file_size bigint,
  file_sha256 text,
  upload_error text,
  customer_email_status text NOT NULL DEFAULT 'not_queued',
  business_email_status text NOT NULL DEFAULT 'not_queued',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS requests_created_at_idx ON requests (created_at DESC);

CREATE TABLE IF NOT EXISTS email_outbox (
  id bigserial PRIMARY KEY,
  request_id text NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('customer_receipt', 'business_notification')),
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, kind)
);

CREATE INDEX IF NOT EXISTS email_outbox_pending_idx
  ON email_outbox (next_attempt_at, id)
  WHERE status IN ('pending', 'retry', 'sending');
