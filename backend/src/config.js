import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function boolean(name, fallback = false) {
  const value = process.env[name];
  if (value == null) return fallback;
  return value === 'true' || value === '1';
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  trustProxy: boolean('TRUST_PROXY', true),
  appOrigin: process.env.APP_ORIGIN || 'https://minifabrika.com',
  publicApiUrl: process.env.PUBLIC_API_URL || 'http://localhost:3000',
  databaseUrl: required('DATABASE_URL'),
  databaseSsl: boolean('DATABASE_SSL', true),
  s3: {
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined,
    bucket: required('S3_BUCKET'),
    accessKeyId: required('S3_ACCESS_KEY_ID'),
    secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
    forcePathStyle: boolean('S3_FORCE_PATH_STYLE', false)
  },
  smtp: {
    host: required('SMTP_HOST'),
    port: Number(process.env.SMTP_PORT || 465),
    secure: boolean('SMTP_SECURE', true),
    user: required('SMTP_USER'),
    pass: required('SMTP_PASS')
  },
  mailFrom: process.env.MAIL_FROM || 'MiniFabrika <info@minifabrika.com>',
  businessEmail: process.env.BUSINESS_EMAIL || 'info@minifabrika.com',
  downloadSigningSecret: required('DOWNLOAD_SIGNING_SECRET'),
  downloadLinkTtlSeconds: Number(process.env.DOWNLOAD_LINK_TTL_SECONDS || 604800),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 52_428_800)
};
