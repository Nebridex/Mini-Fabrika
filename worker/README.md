# MiniFabrika Cloudflare Worker

Production API: `minifabrika-api`

Public endpoints:

- `GET /health`
- `GET /download/:quoteId?token=...`
- `POST /quote` (`multipart/form-data`)
- `POST /message`

## Güvenlik modeli

- Teklif önce D1'e yazılır; mail arızası lead kaybına yol açmaz.
- STL, 3MF, OBJ ve ZIP dosyaları private R2 bucket'ta tutulur; ZIP/3MF sunucuda açılmaz.
- Müşteri dosyaları e-postaya eklenmez. Admin yalnızca süreli private indirme bağlantısı alır.
- Yeni indirme bağlantıları 30 gün geçerlidir. D1'de raw token yerine SHA-256 token hash'i saklanır; eski linkler migration uyumluluğu için doğrulanmaya devam eder.
- `/quote` ve `/message` D1 tabanlı IP rate limit ile korunur. Teklif teyit e-postası için ayrıca hedef e-posta başına saatlik limit uygulanır.
- CORS allowlist yalnızca `https://minifabrika.com` ve `https://www.minifabrika.com` içerir.
- Upload boyutu 50 MB ile sınırlıdır ve dosya uzantısı/imzası doğrulanır.
- SMTP TLS sertifika doğrulaması açıktır.
- `SMTP_PASSWORD` yalnız Cloudflare Secret olarak tutulmalıdır; repoya yazılmamalıdır.

## Configuration

Bindings and non-secret mail variables are in `wrangler.toml`.

Required secret:

```sh
npx wrangler secret put SMTP_PASSWORD
```

D1 schema:

```sh
npx wrangler d1 execute minifabrika-quotes --remote --file=schema.sql
```

Runtime code also creates the auxiliary download/rate-limit tables defensively when needed.

## Local checks and deployment

```sh
npm ci
npm test
npx wrangler deploy --dry-run --outdir .wrangler-dry-run
npm audit --omit=dev --audit-level=high
```

Production deploys are tied to `main`; changes should pass the Worker checks workflow before merge.
