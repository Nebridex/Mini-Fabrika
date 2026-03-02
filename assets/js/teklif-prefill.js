(function () {
  function q(sel, ctx) { return (ctx || document).querySelector(sel); }
  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function init() {
    var form = q('.quote-form');
    if (!form) return;

    var params = new URLSearchParams(window.location.search);
    var title = params.get('title') || '';
    var category = params.get('category') || '';
    var link = params.get('link') || '';

    var modelLink = q('#modelLink', form);
    if (link && modelLink && !modelLink.value) modelLink.value = link;

    var box = q('[data-selected-model]');
    var text = q('[data-selected-model-text]');
    var clearBtn = q('[data-selected-model-clear]');
    var banner = q('[data-prefill-banner]');

    if (title || category || link) {
      if (box && text) {
        box.hidden = false;
        text.innerHTML = '<strong>' + escapeHtml(title || 'Seçili model') + '</strong>' +
          (category ? ' · ' + escapeHtml(category) : '') +
          (link ? ' · <a href="' + escapeHtml(link) + '" target="_blank" rel="noopener noreferrer">Model linki</a>' : '');
      }
      if (banner) banner.hidden = false;
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (modelLink) modelLink.value = '';
        if (box) box.hidden = true;
        var url = new URL(window.location.href);
        ['title', 'category', 'link'].forEach(function (k) { url.searchParams.delete(k); });
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
