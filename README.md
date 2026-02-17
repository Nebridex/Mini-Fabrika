# Mini Fabrika

`minifabrika.net` için hazırlanmış statik, çok sayfalı 3D baskı satış sitesi.

## Sayfa Yapısı

- `index.html`: Ana satış sayfası (MakerWorld üzerinden model bulup talep oluşturma akışı)
- `malzeme-uretim.html`: Malzeme ve üretim detayları
- `iletisim.html`: İletişim ve sosyal medya sayfası
- `styles.css`: Ortak stiller

## Main'e tek seferde canlı alma (önerilen)

Bu repo artık `main` branch'e push edildiğinde otomatik olarak GitHub Pages'a deploy olacak şekilde hazırlandı.

### 1) İlk kurulum (GitHub üzerinde)

1. Repository → **Settings → Pages**
2. **Build and deployment** bölümünde **Source = GitHub Actions** seçin.
3. Custom domain olarak `minifabrika.net` tanımlayın (repo içinde `CNAME` zaten mevcut).

### 2) Lokalde tek seferlik hazırlık

```bash
git branch -M main
git remote add origin <REPO_URL>
git push -u origin main
```

> Eğer `origin` zaten varsa sadece son satırı çalıştırmanız yeterli olur.

### 3) Sonraki yayınlar

Her yeni değişiklikte yalnızca:

```bash
git add .
git commit -m "içerik güncellemesi"
git push
```

Push sonrası GitHub Actions otomatik deploy eder.

## Hızlı Özelleştirme

- İletişim mail adresini ve sosyal medya linklerini güncelleyin.
- Malzeme tablosunu kendi üretim gerçeklerinize göre düzenleyin.
- Ana sayfadaki CTA metinlerini kampanyanıza göre değiştirin.
