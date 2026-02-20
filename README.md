# Mini Fabrika

`minifabrika.net` için hazırlanmış statik, çok sayfalı 3D baskı satış sitesi.

## Sayfa Yapısı

- `index.html`: Ana satış sayfası (CTA, güven blokları, süreç akışı ve FAQ)
- `teklif.html`: Detaylı teklif toplama formu
- `iletisim.html`: İletişim ve sosyal medya sayfası

## Formspree Kurulumu

1. Formspree'de yeni bir form açın.
2. **Send submissions to** alanına `info@minifabrika.com` yazın.
3. `teklif.html` içindeki form action değerinde `FORM_ID` kısmını kendi Formspree ID'nizle değiştirin:

```html
<form action="https://formspree.io/f/FORM_ID" method="POST">
```

4. Form gönderimi sonrası yönlendirme için `_redirect` alanı `https://minifabrika.net/tesekkurler.html` olarak ayarlanmıştır.

## Test Adımları

1. Yerelde bir statik sunucu ile çalıştırın (`python3 -m http.server 8080`).
2. `http://localhost:8080/teklif.html` sayfasında formu doldurun.
3. Boş zorunlu alan bırakarak client-side doğrulamayı test edin.
4. Formu gönderip `tesekkurler.html` sayfasına yönlendiğinizi doğrulayın.
5. Formspree panelinden talebin `info@minifabrika.com` alıcısına düştüğünü kontrol edin.

## Yayına Alma (GitHub Pages)

1. Bu repoyu GitHub'a gönderin.
2. **Settings → Pages** bölümünden doğru branch'i seçin.
3. `CNAME` dosyası sayesinde `minifabrika.net` alan adı korunur.
