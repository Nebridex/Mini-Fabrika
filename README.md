# Mini Fabrika

`minifabrika.net` için hazırlanmış statik, çok sayfalı 3D baskı satış sitesi.

## Sayfa Yapısı

- `index.html`: Ana satış sayfası (CTA, güven blokları, süreç akışı ve FAQ)
- `teklif.html`: Detaylı teklif toplama formu
- `iletisim.html`: İletişim ve sosyal medya sayfası
- `assets/js/config.js`: Formspree endpoint ayarı (`FORM_ENDPOINT`)
- `assets/js/form.js`: AJAX form gönderimi + doğrulama + durum mesajları

## Formspree Kurulumu (GitHub Pages Uyumlu)

1. Formspree'de yeni bir form açın.
2. **Send submissions to** alanına `info@minifabrika.com` yazın.
3. Form endpoint'inizi alın (ör: `https://formspree.io/f/abcdwxyz`).
4. `assets/js/config.js` içinde `REPLACE_WITH_YOUR_ID` kısmını kendi ID'nizle değiştirin.

```js
window.MINIFAB_CONFIG = {
  FORM_ENDPOINT: 'https://formspree.io/f/REPLACE_WITH_YOUR_ID'
};
```

> Form gönderimleri Formspree üzerinden `info@minifabrika.com` adresine düşecek şekilde yapılandırılmalıdır.

## Test Adımları

1. Yerelde bir statik sunucu ile çalıştırın (`python3 -m http.server 8080`).
2. `http://localhost:8080/teklif.html` sayfasında formu doldurun.
3. Boş zorunlu alan bırakarak client-side doğrulamayı test edin.
4. Formu başarılı gönderince inline başarı mesajının göründüğünü doğrulayın.
5. Hata simülasyonu için endpoint'i geçici olarak bozup inline hata mesajını kontrol edin.

## Yayına Alma (GitHub Pages)

1. Bu repoyu GitHub'a gönderin.
2. **Settings → Pages** bölümünden doğru branch'i seçin.
3. `CNAME` dosyası sayesinde `minifabrika.net` alan adı korunur.
