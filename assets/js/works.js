(function () {
  function esc(str) {
    return String(str || '').replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  function slugifyCategory(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var grid = document.getElementById('products-grid');
    var countNode = document.querySelector('[data-results-count]');
    var searchInput = document.getElementById('productSearch');
    var filterButtons = Array.prototype.slice.call(document.querySelectorAll('.work-filter-btn'));
    var emptyState = document.getElementById('works-empty');
    var activeFilter = 'tumu';
    var works = [];

    if (!grid) return;

    function render(items) {
      grid.innerHTML = items.map(function (item) {
        var quoteUrl = '/teklif.html?title=' + encodeURIComponent(item.title);
        return '<article class="card product-card" data-category="' + esc(slugifyCategory(item.category)) + '">' +
          '<img class="topic-thumb" src="' + esc(item.image) + '" loading="lazy" width="700" height="420" alt="' + esc(item.title) + ' üretim örneği" />' +
          '<h2>' + esc(item.title) + '</h2>' +
          '<p>' + esc(item.description) + '</p>' +
          '<div class="meta-row"><span class="tag">' + esc(item.category) + '</span><span class="tag">Malzeme: ' + esc(item.material) + '</span><span class="tag">' + esc(item.fit || '-') + '</span></div>' +
          '<p class="form-note"><strong>Üretim notu:</strong> ' + esc(item.note || '-') + '</p>' +
          '<div class="quote-actions"><a class="btn btn-primary" href="' + quoteUrl + '">Benzer Adetli İş İçin Teklif Al</a></div>' +
          '</article>';
      }).join('');
    }

    function applyFilters() {
      var term = (searchInput && searchInput.value || '').trim().toLowerCase();
      var filtered = works.filter(function (item) {
        var inCategory = activeFilter === 'tumu' || slugifyCategory(item.category) === activeFilter;
        var haystack = [item.title, item.description, item.category, item.material, item.fit, item.note].join(' ').toLowerCase();
        return inCategory && (!term || haystack.indexOf(term) > -1);
      });

      render(filtered);
      if (countNode) countNode.textContent = filtered.length + ' örnek listeleniyor.';
      if (emptyState) emptyState.hidden = filtered.length > 0;
    }

    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterButtons.forEach(function (x) { x.classList.remove('active'); });
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter') || 'tumu';
        applyFilters();
      });
    });

    if (searchInput) searchInput.addEventListener('input', applyFilters);

    fetch('/assets/data/works.json')
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('works.json yüklenemedi')); })
      .then(function (data) {
        works = Array.isArray(data) ? data : [];
        applyFilters();
      })
      .catch(function () {
        works = [];
        applyFilters();
      });
  });
})();
