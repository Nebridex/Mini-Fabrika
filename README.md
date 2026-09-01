# MiniFabrika

`minifabrika.com` için hazırlanmış statik, çok sayfalı adetli 3D baskı üretim sitesi.

## İş Modeli

MiniFabrika'nın güncel odağı **hazır STL / 3MF / OBJ dosyalarından adetli ve tekrarlı üretim**dir.

Temel kurallar:

- Tek parça bireysel / hobi baskısı ana hizmet kapsamına dahil değildir.
- Sıfırdan 3D modelleme hizmeti sunulmaz.
- 1–3 adet üretim, devamında planlanan adetli üretimin numune / doğrulama aşaması olarak değerlendirilebilir.
- Müşterinin şirket veya birey olması belirleyici değildir; kriter işin tekrarlı/adetli üretime uygun olmasıdır.
- Evrensel sabit minimum adet veya minimum TL eşiği kullanılmaz; proje ekonomisi baskı süresi, malzeme, tabla verimliliği ve toplam hacme göre değerlendirilir.
- Tüm üretim talepleri `teklif.html` üzerinden toplanabilir.

## SEO Phase 2 Sayfa Mimarisi

- `/`: Ana satış ve konumlandırma sayfası; adetli 3D baskı ve küçük seri üretim.
- `/3d-baski-hizmeti-istanbul/`: İstanbul 3D baskı ticari arama niyeti.
- `/stl-dosyasindan-3d-baski/`: STL/3MF/OBJ dosyasından üretim arama niyeti.
- `/prototip-kucuk-seri-uretim/`: Prototip, numune ve küçük seri arama niyeti.
- `/kurumsal/`: Kurumsal/B2B adetli 3D baskı arama niyeti.
- `/teklif.html`: Hazır dosya + hedef adet odaklı üretim teklif formu.
- `/blog/`: Bilgi niyetli fiyat, malzeme ve teknik kalite içerikleri.
- `/sorular.html`: Soru/cevap ve içerik fikri toplama.
- `/bireysel/`: `noindex,follow`; STL'den adetli üretim sayfasına yönlendirilir.
- `/tasarla.html`: Emekliye ayrılmış tasarım hizmeti; `noindex,follow` ile ana sayfaya yönlendirilir.

Ticari landing sayfaları birbirinden ayrı sorgu niyetlerine sahip olmalıdır; blog içerikleri aynı ticari sorguları birebir hedefleyerek keyword cannibalization yaratmamalıdır.

## Analytics

Google Analytics 4 ölçüm kimliği: `G-SGLPG3FT3V`.

`assets/js/tracking.js`:

- GA4 yükleyicisini başlatır.
- `click_cta` ve geriye uyumluluk için `click_quote_cta` eventlerini gönderir.
- `click_whatsapp` ve `click_email` eventlerini toplar.
- Teklif gönderiminde `form_submit_attempt` ve `quote_submit_attempt` eventlerini gönderir.
- Başarılı teklif sonrası `generate_lead` eventini üretir.
- UTM/referrer attribution alanlarını FormSubmit formlarına ekler.

## Teklif Formu

`teklif.html` formu FormSubmit üzerinden `info@minifabrika.com` adresine gönderilir.

```html
<form action="https://formsubmit.co/info@minifabrika.com" method="POST" enctype="multipart/form-data">
```

Dosya görülmeden otomatik fiyat veya sabit teslim süresi gösterilmez. Gerçek teklif teknik inceleme sonrası hazırlanır.

## Yayına Alma

Production branch: `main`.

GitHub Pages üzerinden `minifabrika.com` alan adına yayınlanır. `CNAME` dosyası alan adını korur.

SEO Phase 2 öncesi geri dönüş noktası: `backup/main-pre-seo-phase2-2026-09-01`.

Deploy sonrası temel URL kontrolleri:

- `/`
- `/3d-baski-hizmeti-istanbul/`
- `/stl-dosyasindan-3d-baski/`
- `/prototip-kucuk-seri-uretim/`
- `/kurumsal/`
- `/teklif.html`
- `/sitemap.xml`

## İçerik İlkeleri

- Gerçek olmayan müşteri yorumu, referans, adet, kapasite veya kalite garantisi yazılmaz.
- Dosya görülmeden fiyat veya termin tahmini yayınlanmaz.
- Her parçaya uygulanabilecek sabit tolerans garantisi verilmez.
- Gerçek müşteri işleri yalnızca yayın izni varsa vaka çalışması / referans olarak gösterilir.
- SEO içeriği tekil/hobi baskı ve modelleme talebi toplamaya değil, hazır dosyalı adetli üretim niyetine odaklanır.
