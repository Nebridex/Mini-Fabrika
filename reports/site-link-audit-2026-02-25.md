# Mini Fabrika Link Analizi (2026-02-25)

## Yöntem
- Site içi sayfalar Firefox tabanlı Playwright ile tarandı.
- Dahili linkler (`minifabrika.com`) tek tek ziyaret edilerek HTTP durum kodları kontrol edildi.
- Harici linkler (YouTube, Instagram, X, WhatsApp, MakerWorld) ayrıca kontrol edildi.
- Not: Bot benzeri isteklerde (`curl` / request context) MakerWorld tarafında 403 görülebiliyor.

## Taranan ana dahili sayfalar
- `https://minifabrika.com/`
- `https://minifabrika.com/index.html`
- `https://minifabrika.com/malzeme-uretim.html`
- `https://minifabrika.com/islerimiz.html`
- `https://minifabrika.com/blog/index.html`
- `https://minifabrika.com/tasarla.html`
- `https://minifabrika.com/teklif.html`
- `https://minifabrika.com/iletisim.html`
- `https://minifabrika.com/blog/malzeme-secimi-rehberi.html`
- `https://minifabrika.com/blog/makerworld-model-siparis.html`
- `https://minifabrika.com/blog/teknik-baski-kalitesi-rehberi.html`

## Bulgular (özet)
1. Dahili sayfalarda kırık link bulunmadı; taranan tüm sayfalar 200 döndü.
2. Sosyal/iletişim linkleri çalışıyor (WhatsApp, YouTube, Instagram, X).
3. `islerimiz.html` üzerinde MakerWorld arama linkleri mevcut.
4. MakerWorld linkleri gerçek tarayıcı gezintisinde açılıyor (200), ancak bot benzeri HTTP isteklerinde 403 dönebiliyor.

## "Çalışmayan link" listesi
- Kesin kırık (404/5xx veya açılmama): **tespit edilmedi**.

## Riskli/izlenmesi gereken link grubu
Aşağıdaki MakerWorld arama linkleri tarayıcı dışında (ör. bazı uptime botları, sunucu-side checker, `curl`) 403 dönebilir:

- `https://makerworld.com/en/search/models?keyword=desk%20organizer`
- `https://makerworld.com/en/search/models?keyword=phone%20stand`
- `https://makerworld.com/en/search/models?keyword=cable%20holder`
- `https://makerworld.com/en/search/models?keyword=headphone%20stand`
- `https://makerworld.com/en/search/models?keyword=tool%20hook`
- `https://makerworld.com/en/search/models?keyword=bit%20holder`
- `https://makerworld.com/en/search/models?keyword=clamp%20knob`
- `https://makerworld.com/en/search/models?keyword=spool%20holder`
- `https://makerworld.com/en/search/models?keyword=articulated%20dragon`
- `https://makerworld.com/en/search/models?keyword=figure%20stand`
- `https://makerworld.com/en/search/models?keyword=name%20plate`
- `https://makerworld.com/en/search/models?keyword=plant%20pot`
- `https://makerworld.com/en/search/models?keyword=logo%20stand`
- `https://makerworld.com/en/search/models?keyword=card%20holder`
- `https://makerworld.com/en/search/models?keyword=badge%20clip`
- `https://makerworld.com/en/search/models?keyword=keychain`
- `https://makerworld.com/en/search/models?keyword=controller%20stand`
- `https://makerworld.com/en/search/models?keyword=watch%20dock`
- `https://makerworld.com/en/search/models?keyword=cable%20clip`
- `https://makerworld.com/en/search/models?keyword=camera%20mount`

## Çözüm önerileri
1. MakerWorld linklerini direkt dışarı vermek yerine önce iç sayfaya (ör. `teklif.html`) yönlendirip burada "MakerWorld'de aç" CTA'sı gösterin.
2. Link kontrol otomasyonunda yalnızca status code'a bakmayın; tarayıcı tabanlı doğrulama (Playwright) ekleyin.
3. Harici linkler için periyodik "user-agent çeşitlendirmeli" health-check uygulayın.
4. `target="_blank" rel="noopener noreferrer"` standardını harici linklerde tutarlı kullanın.
5. Kritik harici kaynaklar için fallback metni ekleyin ("Link açılmazsa kopyala" + doğrudan URL).
