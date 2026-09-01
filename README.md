# Mini Fabrika

`minifabrika.com` için hazırlanmış statik, çok sayfalı 3D baskı satış sitesi.

## Sayfa Yapısı

- `index.html`: Ana satış sayfası; İstanbul 3D baskı, hazır dosya ve adetli üretim odağı
- `3d-baski-hizmeti-istanbul/`: Ticari yerel arama landing sayfası
- `kurumsal/`: B2B kurumsal 3D baskı ve adetli üretim
- `stl-dosyasindan-3d-baski/`: Hazır STL/3MF/OBJ dosyasından üretim landing sayfası
- `prototip-kucuk-seri-uretim/`: Numune, prototip ve küçük seri üretim landing sayfası
- `teklif.html`: Hazır model dosyalı adetli üretim teklif formu
- `islerimiz.html`: Üretim örnekleri
- `malzeme-uretim.html`: PLA/PETG/ABS/TPU teknik rehberi
- `blog/`: Bilgi niyetli içerikler; ticari landing sayfalarla keyword cannibalization yaratmamalı
- `iletisim.html`: İletişim kanalları

`bireysel/` artık `noindex,follow` ve `stl-dosyasindan-3d-baski/` sayfasına yönlendirilir. Tek adet hobi/dekoratif baskı ana hizmet odağı değildir.

## Form Kurulumu (FormSubmit)

`teklif.html` formu doğrudan aşağıdaki endpoint'e gönderim yapar:

```html
<form action="https://formsubmit.co/info@minifabrika.com" method="POST">
```

- Form gönderimi sonrası yönlendirme `_next` ile `https://minifabrika.com/tesekkurler.html` sayfasına yapılır.
- İlk canlı gönderimde FormSubmit doğrulama e-postası gönderebilir; doğrulama sonrası form aktif olur.
- Formda model linki yanında `STL/3MF/OBJ` dosya yükleme alanı vardır; yüklenen dosya form gönderimiyle birlikte aynı alıcıya (`info@minifabrika.com`) iletilir.
- GA4 ölçüm kimliği `G-SGLPG3FT3V`; `assets/js/tracking.js` page view, CTA, WhatsApp, form submit ve lead eventlerini toplar.

## Test Adımları

1. Yerelde bir statik sunucu ile çalıştırın (`python3 -m http.server 8080`).
2. `http://localhost:8080/teklif.html` sayfasında formu doldurun.
3. Boş zorunlu alan bırakarak client-side doğrulamayı test edin.
4. Formu gönderip `tesekkurler.html` sayfasına yönlendiğinizi doğrulayın.
5. Gelen talebin `info@minifabrika.com` alıcısına düştüğünü kontrol edin.

## Yayına Alma (GitHub Pages)

1. Production Pages kaynağı `gk32i7-codex/conduct-repository-wide-redesign-and-refactor` branch'idir.
2. `CNAME` dosyası sayesinde `minifabrika.com` alan adı korunur.
3. `sitemap.xml` yalnızca indexlenmesi istenen satış ve destek sayfalarını içerir.

## Güvenlik ve Kalite Kontrol Notları

- Form endpoint'i `teklif.html` içinde FormSubmit olarak tanımlıdır; alıcı değişecekse action URL'sindeki e-posta güncellenmelidir.
- Analytics attribution alanları form gönderimlerine hidden field olarak eklenir.
- SEO Phase 2 öncesi rollback branch'i: `backup/pre-seo-phase2-2026-09-01`.
