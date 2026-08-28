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
- Tüm talepler tek merkezden `teklif.html` üzerinden toplanır.

## Sayfa Yapısı

- `index.html`: Ana satış ve konumlandırma sayfası.
- `teklif.html`: Hazır dosya + hedef adet odaklı üretim teklif formu.
- `kurumsal/index.html`: Yüksek adetli, çok parçalı ve proje yönetimi gerektiren işler için derinleşme sayfası.
- `islerimiz.html`: Müşteri referansı iddiası taşımayan üretim tipi örnekleri.
- `malzeme-uretim.html`: PLA, PETG, ABS ve TPU için üretim karar rehberi.
- `iletisim.html`: Genel iletişim ve merkezi teklif yönlendirmesi.
- `blog/`: Adetli üretim, malzeme ve teknik kalite SEO içerikleri.
- `bireysel/index.html`: Eski bireysel URL trafiğini yeni teklif akışına taşıyan noindex yönlendirme sayfası.
- `tasarla.html`: Emekliye ayrılmış tasarım hizmeti için noindex yönlendirme sayfası.

## Teklif Formu

`teklif.html` formu FormSubmit üzerinden `info@minifabrika.com` adresine gönderilir.

```html
<form action="https://formsubmit.co/info@minifabrika.com" method="POST" enctype="multipart/form-data">
```

Formun temel girdileri:

- Üretime hazır STL / 3MF / OBJ dosyası veya erişilebilir bağlantı.
- Planlanan toplam adet (en az 2).
- İsteniyorsa 1–3 adet numune.
- Kullanım amacı ve kritik ölçüler.
- Malzeme / renk tercihi.
- Hedef teslim tarihi ve teslimat şehri.
- İletişim bilgileri.

Dosya görülmeden otomatik fiyat veya sabit teslim süresi gösterilmez. Gerçek teklif teknik inceleme sonrası hazırlanır.

## Form Test Adımları

1. Yerelde statik sunucu ile siteyi açın.
2. `teklif.html` sayfasında dosyasız ilerlemenin engellendiğini doğrulayın.
3. Planlanan toplam adet `1` iken formun ilerlemediğini doğrulayın.
4. Adet `2+` ve geçerli dosya/link ile zorunlu alan doğrulamasını test edin.
5. Numune alanının ana toplam adetten ayrı çalıştığını kontrol edin.
6. Form gönderimi sonrası `tesekkurler.html` sayfasına yönlendirmeyi doğrulayın.
7. Talebin `info@minifabrika.com` adresine ulaştığını ve dosya ekinin geldiğini kontrol edin.

## Yayına Alma

Repo GitHub Pages üzerinden `minifabrika.com` alan adına yayınlanır. `CNAME` dosyası alan adını korur.

Deploy sonrası kontrol edilmesi gereken temel URL'ler:

- `/`
- `/teklif.html`
- `/kurumsal/`
- `/islerimiz.html`
- `/malzeme-uretim.html`
- `/iletisim.html`
- `/blog/index.html`
- `/bireysel/` → `/teklif.html` yönlendirmesi
- `/tasarla.html` → `/` yönlendirmesi

## İçerik İlkeleri

- Gerçek olmayan müşteri yorumu, referans, adet, kapasite veya kalite garantisi yazılmaz.
- Dosya görülmeden fiyat veya termin tahmini yayınlanmaz.
- Her parçaya uygulanabilecek sabit tolerans garantisi verilmez.
- Gerçek müşteri işleri yalnızca yayın izni varsa vaka çalışması / referans olarak gösterilir.
- SEO içeriği tekil/hobi baskı ve modelleme talebi toplamaya değil, hazır dosyalı adetli üretim niyetine odaklanır.
