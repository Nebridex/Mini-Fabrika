(function () {
  function $(s, c) { return (c || document).querySelector(s); }

  function initQuickCalc() {
    var material = $('#quickMaterial');
    var qty = $('#quickQty');
    var urgency = $('#quickUrgency');
    var output = $('[data-quick-output]');
    if (!material || !qty || !urgency || !output) return;

    function update() {
      var base = 350;
      var q = Math.max(1, Number(qty.value || 1));
      var m = Number(material.value || 1);
      var u = Number(urgency.value || 1);
      var min = Math.round(base * m * u + (q - 1) * 55);
      var max = Math.round(min * 1.35);
      output.textContent = 'Yaklaşık: ₺' + min + ' - ₺' + max;
    }

    [material, qty, urgency].forEach(function (el) {
      el.addEventListener('input', update);
      el.addEventListener('change', update);
    });
    update();
  }

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
    initQuickCalc();
    initTestimonials();
    initFaqSearch();
  });
})();
