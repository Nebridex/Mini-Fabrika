# MiniFabrika request backend

This service replaces FormSubmit for quote, corporate, question and article-comment forms.

## Guarantees

- Every accepted submission is written to PostgreSQL with an atomic `MF-YYYYMMDD-XXX` ID.
- STL, 3MF, OBJ and ZIP are the only accepted upload extensions.
- Files are stored in a private S3-compatible bucket and are never attached to email.
- ZIP entries are inspected from archive metadata without extraction. The allowlist is limited to model, material, image, text and PDF files; executables, scripts, nested archives, encrypted entries, symlinks and unsafe paths are rejected.
- Customer and business messages use a durable PostgreSQL outbox. An SMTP failure never rolls back the request, and delivery is retried with backoff.
- Business notifications contain an expiring, HMAC-signed download URL. The bucket itself stays private.

## Run

1. Copy `.env.example` to `.env` and supply PostgreSQL, private object storage and SMTP credentials.
2. Run `npm ci`.
3. Run `npm run db:migrate` once.
4. Run `npm start` or build the included Dockerfile.
5. Point `api.minifabrika.com` to the HTTPS service.

The frontend only permits `https://minifabrika.com` through CORS in production. Set `APP_ORIGIN` differently for a staging deployment.

## Operational notes

- Keep the object-storage bucket private; do not enable a public bucket URL.
- Configure retention/deletion policy according to MiniFabrika's privacy notice and legal obligations.
- `DOWNLOAD_SIGNING_SECRET` should be at least 32 random bytes and rotated through the hosting platform's secret store.
- The SMTP account must be authorized to send as `info@minifabrika.com`; configure SPF, DKIM and DMARC for deliverability.
- Run a single migration job during deployment. Multiple application instances may process the outbox safely through row locking.
