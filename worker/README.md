# MiniFabrika Cloudflare Worker

The production quote API is deployed as `minifabrika-api` and exposes:

- `GET /health`
- `POST /quote` (`multipart/form-data`)

The Worker writes the request to D1 before uploading its STL, 3MF, OBJ or ZIP file to the private R2 bucket. ZIP files are stored as opaque objects and are never extracted. Customer and administrator messages are sent through Resend after persistence; email failure does not turn a stored quote into a failed submission.

## Configuration

Bindings and non-secret mail variables are declared in `wrangler.toml`. Add the production Resend credential with `wrangler secret put RESEND_API_KEY`; never commit it. Apply `schema.sql` to D1 before the first deployment.

## Local checks and deployment

```sh
npm install
npm test
npm run deploy
```

The production CORS allowlist contains only `https://minifabrika.com` and `https://www.minifabrika.com`.
