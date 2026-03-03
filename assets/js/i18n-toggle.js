(function () {
  var STORAGE_KEY = 'mf_lang';
  var LANG_TR = 'tr';
  var LANG_EN = 'en';

  var trToEn = {
    'Ana Sayfa': 'Home',
    'Malzeme & Üretim': 'Materials & Production',
    'İşlerimiz': 'Our Work',
    'Blog': 'Blog',
    '3D Tasarla': '3D Design',
    'Teklif Formu': 'Quote Form',
    'İletişim': 'Contact',
    'Teklif Al': 'Get a Quote',
    'Örnek Baskılar': 'Sample Prints',
    'Hızlı Teklif Al': 'Quick Quote',
    'WhatsApp’tan Yaz': 'Message on WhatsApp',
    'İstanbul merkezli üretim · Türkiye geneli gönderim': 'Istanbul-based production · Nationwide shipping in Türkiye',
    'Modelini gönder, 24 saatte teklifini al.': 'Send your model, get your quote in 24 hours.',
    '24 Saatte Teklif': 'Quote in 24 Hours',
    'Minimum Sipariş: 350 TL': 'Minimum Order: 350 TRY',
    'Nasıl Çalışır?': 'How It Works',
    'Neden Güvenilir?': 'Why Choose Us?',
    'Sık Sorulan Sorular': 'Frequently Asked Questions',
    'İstanbul merkezli üretim': 'Istanbul-based production',
    'Türkiye geneli kargo': 'Nationwide shipping in Türkiye',
    'Teşekkürler! Talebini aldık. 24 saat içinde dönüş yapacağız.': 'Thank you! We received your request. We will respond within 24 hours.',
    'Teşekkürler': 'Thank You',
    'Teklif Al': 'Get a Quote',
    'Talebini detaylı paylaş, 24 saat içinde teknik teklifini iletelim.': 'Share your request in detail; we will send your technical quote within 24 hours.',
    '3D Baskı Talep Formu': '3D Printing Quote Form',
    'Model': 'Model',
    'Detaylar': 'Details',
    'Gönder': 'Submit',
    'Seçilen Model': 'Selected Model',
    'Temizle': 'Clear',
    'Hizmet *': 'Service *',
    'Model Linki (varsa)': 'Model Link (optional)',
    'STL / 3MF / OBJ Dosyası (varsa)': 'STL / 3MF / OBJ File (optional)',
    'Lütfen dosya yükleyin veya model linki girin.': 'Please upload a file or enter a model link.',
    'Model linki veya dosya yüklemesinden en az birini ekleyin.': 'Please provide at least a model link or a file upload.',
    'Devam': 'Continue',
    'Ad Soyad *': 'Full Name *',
    'E-posta *': 'Email *',
    'Telefon': 'Phone',
    'Adres *': 'Address *',
    'Teslimat Şehri *': 'Delivery City *',
    'Tahmini Üretim + Teslimat Aralığı': 'Estimated Production + Delivery Range',
    'Şehir seçtiğinizde tahmini aralık gösterilir.': 'Estimated range appears after city selection.',
    'Malzeme *': 'Material *',
    'Adet *': 'Quantity *',
    'Termin *': 'Lead Time *',
    'Tahmini bütçe aralığı': 'Estimated budget range',
    'Notlar / Ölçü / Kullanım amacı *': 'Notes / Dimensions / Use case *',
    'KVKK kapsamında iletişim kurulmasını onaylıyorum. *': 'I consent to communication under KVKK. *',
    'Geri': 'Back',
    'Teklif Talebini Gönder': 'Submit Quote Request',
    "Minimum sipariş tutarı 350 TL'dir.": 'Minimum order amount is 350 TRY.',
    'Seçiniz': 'Select',
    'İstanbul': 'Istanbul',
    'Ankara': 'Ankara',
    'İzmir': 'Izmir',
    'Diğer Şehirler': 'Other Cities',
    'Standart (4-7 iş günü)': 'Standard (4-7 business days)',
    'Hızlı Üretim (1-3 iş günü)': 'Rush Production (1-3 business days)',
    'Bilmiyorum': "I don't know",
    'Doğrudan İletişim': 'Direct Contact',
    'Teklif Süreci': 'Quote Process',
    'Teklif Formuna Git': 'Go to Quote Form',
    'Lokasyon ve Çalışma Saatleri': 'Location and Working Hours',
    'Lokasyon:': 'Location:',
    'Çalışma Saatleri:': 'Working Hours:',
    'İşlerimiz’e göz at': 'Browse Our Work',
    'İşlerimiz': 'Our Work',
    'Kategorilere göre filtreleyin, MakerWorld’de açın veya doğrudan “Bunu Bastır” ile ön-dolu teklif formuna geçin.': 'Filter by categories, open on MakerWorld, or jump to pre-filled quote via “Print This”.',
    'Tümü (30)': 'All (30)',
    'Ofis (6)': 'Office (6)',
    'Atölye (6)': 'Workshop (6)',
    'Hediye (6)': 'Gift (6)',
    'Kurumsal (6)': 'Corporate (6)',
    'Aksesuar (6)': 'Accessories (6)',
    'Son Görüntülediğiniz Ürünler': 'Recently Viewed Products',
    'MiniFabrika · İstanbul merkezli üretim · ': 'MiniFabrika · Istanbul-based production · ',
    'Menüyü aç': 'Open menu'
  };

  function translateInNode(root, map) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var text = node.nodeValue;
      var trimmed = text.trim();
      if (!trimmed || !map[trimmed]) return;
      var start = text.match(/^\s*/)[0];
      var end = text.match(/\s*$/)[0];
      node.nodeValue = start + map[trimmed] + end;
    });

    var attrs = ['placeholder', 'aria-label', 'title', 'value'];
    root.querySelectorAll('*').forEach(function (el) {
      attrs.forEach(function (attr) {
        var v = el.getAttribute(attr);
        if (v && map[v]) el.setAttribute(attr, map[v]);
      });
    });
  }

  function createToggle() {
    var top = document.querySelector('.topbar-inner');
    if (!top) return;
    var controls = top.querySelector('.topbar-controls');
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'topbar-controls';
      top.insertBefore(controls, top.querySelector('.menu-toggle') || top.lastChild);
    }

    if (controls.querySelector('[data-lang-toggle]')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn';
    btn.setAttribute('data-lang-toggle', '');
    btn.setAttribute('aria-label', 'Dil değiştir');
    controls.appendChild(btn);

    function render() {
      var lang = localStorage.getItem(STORAGE_KEY) || LANG_TR;
      btn.textContent = lang === LANG_EN ? 'TR' : 'EN';
      btn.title = lang === LANG_EN ? 'Türkçe' : 'English';
    }

    btn.addEventListener('click', function () {
      var lang = localStorage.getItem(STORAGE_KEY) || LANG_TR;
      localStorage.setItem(STORAGE_KEY, lang === LANG_EN ? LANG_TR : LANG_EN);
      window.location.reload();
    });

    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    createToggle();
    var lang = localStorage.getItem(STORAGE_KEY) || LANG_TR;
    if (lang === LANG_EN) {
      document.documentElement.lang = 'en';
      translateInNode(document.body, trToEn);
    }
  });
})();
