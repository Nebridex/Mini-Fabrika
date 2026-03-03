(function () {
  function $(s, c) { return (c || document).querySelector(s); }

  function initTestimonials() {
    var text = $('[data-testimonial-text]');
    var author = $('[data-testimonial-author]');
    if (!text || !author) return;

    var items = [
      { t: '“Parçalarımız ölçü toleransına tam uydu, ekip çok hızlı dönüş yaptı.”', a: '— Atölye Kullanıcısı, İstanbul' },
      { t: '“MakerWorld linkimizi ilettik, aynı gün teknik geri dönüş aldık.”', a: '— Ürün Geliştirme Ekibi' },
      { t: '“Küçük seri üretimde paketleme ve teslimat süreci sorunsuzdu.”', a: '— E-ticaret Satıcısı' }
    ];

    var i = 0;
    window.setInterval(function () {
      i = (i + 1) % items.length;
      text.textContent = items[i].t;
      author.textContent = items[i].a;
    }, 5000);
  }

  function initFaqSearch() {
    var input = $('#faqSearch');
    var list = $('[data-faq-list]');
    if (!input || !list) return;
    var rows = Array.prototype.slice.call(list.querySelectorAll('details'));

    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      rows.forEach(function (item) {
        var text = item.textContent.toLowerCase();
        item.hidden = q && text.indexOf(q) === -1;
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTestimonials();
    initFaqSearch();
  });
})();
