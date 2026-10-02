CREATE TABLE IF NOT EXISTS quote_requests (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  email_status TEXT NOT NULL DEFAULT 'pending',
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  production_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  material TEXT NOT NULL,
  sample_count INTEGER DEFAULT 0,
  use_case TEXT NOT NULL,
  target_date TEXT,
  file_name TEXT NOT NULL,
  file_key TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  lead_source TEXT,
  lead_medium TEXT,
  lead_campaign TEXT,
  lead_landing_page TEXT,
  lead_referrer_host TEXT,
  lead_gclid TEXT,
  consent INTEGER NOT NULL DEFAULT 1,
  admin_email_sent_at TEXT,
  customer_email_sent_at TEXT,
  last_email_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON quote_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_email ON quote_requests(email);


CREATE TABLE IF NOT EXISTS quote_downloads (
  quote_id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS request_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  route TEXT NOT NULL,
  identity_hash TEXT NOT NULL,
  window_start TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_request_rate_limits_updated_at
  ON request_rate_limits(updated_at);
