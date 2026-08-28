(function () {
  function esc(str) {
    return String(str || '').replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var grid = document.getElementById('products-grid');
    var emptyState = document.getElementById('works-empty');
    if (!grid) return;

    function render(items) {
      if (!items.length) {
        grid.innerHTML = '';
        if (emptyState) emptyState.hidden = false;
        return;
      }

      if (emptyState) emptyState.hidden = true;
      grid.innerHTML = items.map(function (item) {
        var quoteUrl = '/teklif.html?title=' + encodeURIComponent(item.title) + '#teklif-form';
        return '<article class="work-card">' +
          '<div class="work-card-top">' +
            '<span class="work-category">' + esc(item.category) + '</span>' +
            '<span class="work-material">' + esc(item.material) + '</span>' +
          '</div>' +
          '<h2>' + esc(item.title) + '</h2>' +
          '<p class="work-description">' + esc(item.description) + '</p>' +
          '<div class="work-fit"><strong>Uygun olduğu iş:</strong><span>' + esc(item.fit || '-') + '</span></div>' +
          '<div class="work-note"><strong>Üretim yaklaşımı</strong><p>' + esc(item.note || '-') + '</p></div>' +
          '<a class="btn btn-primary" href="' + quoteUrl + '">Bu Tip İş İçin Teklif Al</a>' +
        '</article>';
      }).join('');
    }

    fetch('/assets/data/works.json')
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('works.json yüklenemedi')); })
      .then(function (data) { render(Array.isArray(data) ? data : []); })
      .catch(function () { render([]); });
  });
})();
