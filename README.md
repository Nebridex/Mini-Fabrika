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
