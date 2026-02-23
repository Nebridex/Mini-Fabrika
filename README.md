# Mini Fabrika

`minifabrika.com` için hazırlanmış statik, çok sayfalı 3D baskı satış sitesi.

## Sayfa Yapısı

- `index.html`: Ana satış sayfası (CTA, güven blokları, süreç akışı ve FAQ)
- `teklif.html`: Detaylı teklif toplama formu
- `iletisim.html`: İletişim ve sosyal medya sayfası

## Form Kurulumu (FormSubmit)

`teklif.html` formu doğrudan aşağıdaki endpoint'e gönderim yapar:

```html
<form action="https://formsubmit.co/cihat.oz@minifabrika.com" method="POST">
```

- Form gönderimi sonrası yönlendirme `_next` ile `https://minifabrika.com/tesekkurler.html` sayfasına yapılır.
- İlk canlı gönderimde FormSubmit doğrulama e-postası gönderebilir; doğrulama sonrası form aktif olur.

## Test Adımları

1. Yerelde bir statik sunucu ile çalıştırın (`python3 -m http.server 8080`).
2. `http://localhost:8080/teklif.html` sayfasında formu doldurun.
3. Boş zorunlu alan bırakarak client-side doğrulamayı test edin.
4. Formu gönderip `tesekkurler.html` sayfasına yönlendiğinizi doğrulayın.
5. Gelen talebin `cihat.oz@minifabrika.com` alıcısına düştüğünü kontrol edin.

## Yayına Alma (GitHub Pages)

1. Bu repoyu GitHub'a gönderin.
2. **Settings → Pages** bölümünden doğru branch'i seçin.
3. `CNAME` dosyası sayesinde `minifabrika.com` alan adı korunur.


## Güvenlik ve Kalite Kontrol Notları

- Tüm sayfalarda `referrer` politikası `strict-origin-when-cross-origin` olarak ayarlanmıştır.
- Tarayıcı izinleri için `Permissions-Policy` ile kamera/mikrofon/konum kapatılmıştır.
- Form endpoint'i `teklif.html` içinde FormSubmit olarak tanımlıdır; alıcı değişecekse action URL'sindeki e-posta güncellenmelidir.

## 3D Tasarla → Teklif Aktarımı

- `tasarla.html`, iframe içindeki uygulamadan gelen `postMessage` olayında sadece şu kontratı kabul eder:
  - `origin`: `https://nebridex.github.io`
  - `source`: `minifabrika-app`
  - `version`: `v1`
  - `type`: `MINIFABRIKA_TEKLIF`
- Geçerli payload doğrudan `localStorage` (`mf_teklif_payload`) içine yazılır ve kullanıcı `teklif.html` sayfasına yönlendirilir.
- Payload yanında bir timestamp (`mf_teklif_payload_ts`) tutulur; teklif formu bu veriyi TTL (60 dk) ile okur.
- **Öncelik her zaman `localStorage`'dır.** Query parametreleri sadece acil fallback olarak küçük alanlar (`x,y,z,g,tpl,txt`) için değerlendirilir.
- Form submit akışında temel anti-bot kontrolü için minimum doldurma süresi uygulanır (3 sn altı submit engellenir).
- STL gibi büyük veriler query string'e yazılmamalıdır.
  - Küçük model: `payload.stl.base64` ile indirilebilir dosya üretilebilir.
  - Büyük model: `payload.stl.tooLarge=true` + backend upload akışı kullanılmalı; mümkünse `model_url` gönderilmelidir.
- İsteğe bağlı telemetry için `window.__MF_TRANSFER_LOG_ENDPOINT` tanımlanabilir; uygun endpoint varsa `sendBeacon` ile transfer olayları (accept/reject/TTL/STL) raporlanır, yoksa sadece `console.info` loglanır.

Örnek `postMessage` kontratı:

```js
window.parent.postMessage({
  source: 'minifabrika-app',
  version: 'v1',
  type: 'MINIFABRIKA_TEKLIF',
  payload: {
    x: 42,
    y: 24,
    z: 12,
    gram: 18,
    sure: '1s 45dk',
    sablon: 'Kart Tutucu',
    yazi: 'Mini Fabrika',
    stl: {
      tooLarge: false,
      base64: '...'
    }
  }
}, 'https://minifabrika.com');
```

## Transfer Debug / Runbook

- `tasarla.html` üzerinde reject sebepleri loglanır: `reject-origin`, `reject-source`, `reject-version`, `reject-type`, `reject-payload-schema`.
- `teklif.html?debug_transfer=1` ile aktarım meta bilgisi (source/version) debug amaçlı gösterilir.
- Form temizleme butonu `mf_teklif_payload` ve `mf_teklif_payload_ts` anahtarlarını birlikte temizler.
