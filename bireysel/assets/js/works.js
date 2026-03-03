(function () {
  function q(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function esc(v) {
    return String(v || '').replace(/[&<>'"]/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  function slugifyCategory(category) {
    var map = { 'Ofis': 'ofis', 'Atölye': 'atolye', 'Hediye': 'hediye', 'Kurumsal': 'kurumsal', 'Aksesuar': 'aksesuar' };
    return map[category] || 'tumu';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var grid = q('#products-grid');
    if (!grid) return;

    var countNode = q('[data-results-count]');
    var searchInput = q('#productSearch');
    var filterButtons = qa('.work-filter-btn');
    var works = [];
    var activeFilter = 'tumu';

    function render(items) {
      grid.innerHTML = items.map(function (item) {
        var quoteUrl = 'teklif.html?title=' + encodeURIComponent(item.title) + '&modelLink=' + encodeURIComponent(item.makerworld || '') + '&link=' + encodeURIComponent(item.makerworld || '');
        var extBtn = item.makerworld
          ? '<a class="btn btn-secondary" href="' + esc(item.makerworld) + '" target="_blank" rel="noopener noreferrer">MakerWorld’de Aç</a>'
          : '<button class="btn btn-secondary" type="button" disabled aria-disabled="true">MakerWorld linki yok</button>';
        return '<article class="card product-card" data-category="' + esc(slugifyCategory(item.category)) + '">' +
          '<img class="topic-thumb" src="' + esc(item.image) + '" loading="lazy" width="700" height="420" alt="' + esc(item.title) + ' 3D baskı örneği" />' +
          '<h2>' + esc(item.title) + '</h2><p>' + esc(item.description) + '</p>' +
          '<div class="meta-row"><span class="tag">' + esc(item.material) + '</span><span class="tag">' + esc(item.time) + '</span><span class="tag">' + esc(item.category) + '</span></div>' +
          '<div class="quote-actions">' + extBtn + '<a class="btn btn-primary" href="' + quoteUrl + '">Bunu Bastır</a></div>' +
          '</article>';
      }).join('');
    }

    function applyFilters() {
      var term = (searchInput && searchInput.value || '').trim().toLowerCase();
      var filtered = works.filter(function (item) {
        var inCategory = activeFilter === 'tumu' || slugifyCategory(item.category) === activeFilter;
        var haystack = (item.title + ' ' + item.description + ' ' + item.category + ' ' + item.material).toLowerCase();
        return inCategory && (!term || haystack.indexOf(term) > -1);
      });
      render(filtered);
      if (countNode) countNode.textContent = filtered.length + ' sonuç listeleniyor.';
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

    fetch('assets/data/works.json')
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('works.json yüklenemedi')); })
      .then(function (data) {
        works = Array.isArray(data) ? data : [];
        applyFilters();
      })
      .catch(function () {
        works = Array.isArray(window.MINIFAB_PRODUCTS) ? window.MINIFAB_PRODUCTS.map(function (item) {
          var categoryMap = { Office: 'Ofis', Workshop: 'Atölye', Gift: 'Hediye', Corporate: 'Kurumsal', Accessories: 'Aksesuar' };
          return {
            title: item.title,
            description: item.description,
            category: categoryMap[item.category] || 'Ofis',
            material: item.material,
            time: item.time,
            image: item.img,
            makerworld: item.link
          };
        }) : [];
        applyFilters();
      });
  });
})();
