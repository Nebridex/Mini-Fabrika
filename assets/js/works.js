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
        var quoteUrl = 'teklif.html?title=' + encodeURIComponent(item.title) + '&modelLink=' + encodeURIComponent(item.makerworld || '');
        var makerBtn = item.makerworld
          ? '<a class="btn btn-secondary" href="' + esc(item.makerworld) + '" target="_blank" rel="noopener noreferrer">Kaynağı Aç</a>'
          : '<button class="btn btn-secondary" type="button" disabled>Kaynak linki yok</button>';

        return '<article class="card product-card" data-category="' + esc(slugifyCategory(item.category)) + '">' +
          '<img class="topic-thumb" src="' + esc(item.image) + '" loading="lazy" width="700" height="420" alt="' + esc(item.title) + ' örnek baskı" />' +
          '<h2>' + esc(item.title) + '</h2>' +
          '<p>' + esc(item.description) + '</p>' +
          '<div class="meta-row"><span class="tag">Kategori: ' + esc(item.category) + '</span><span class="tag">Önerilen malzeme: ' + esc(item.material) + '</span><span class="tag">Üretim notu: ' + esc(item.difficulty || item.time || '-') + '</span></div>' +
          '<div class="quote-actions">' + makerBtn + '<a class="btn btn-primary" href="' + quoteUrl + '">Bu modele teklif al</a></div>' +
          '</article>';
      }).join('');
    }

    function applyFilters() {
      var term = (searchInput && searchInput.value || '').trim().toLowerCase();
      var filtered = works.filter(function (item) {
        var inCategory = activeFilter === 'tumu' || slugifyCategory(item.category) === activeFilter;
        var haystack = [item.title, item.description, item.category, item.material, item.difficulty, item.time].join(' ').toLowerCase();
        return inCategory && (!term || haystack.indexOf(term) > -1);
      });

      render(filtered);
      if (countNode) countNode.textContent = filtered.length + ' sonuç listeleniyor.';
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

    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }

    fetch('/assets/data/works.json')
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('works.json yüklenemedi')); })
      .then(function (data) {
        works = Array.isArray(data) ? data : [];
        if (!works.length && Array.isArray(window.MINIFAB_PRODUCTS)) {
          works = window.MINIFAB_PRODUCTS.map(function (item) {
            return {
              title: item.title,
              description: item.description,
              category: item.category,
              material: item.material,
              difficulty: item.time,
              image: item.img,
              makerworld: item.link
            };
          });
        }
        applyFilters();
      })
      .catch(function () {
        works = Array.isArray(window.MINIFAB_PRODUCTS) ? window.MINIFAB_PRODUCTS.map(function (item) {
          return {
            title: item.title,
            description: item.description,
            category: item.category,
            material: item.material,
            difficulty: item.time,
            image: item.img,
            makerworld: item.link
          };
        }) : [];
        applyFilters();
      });
  });
})();
