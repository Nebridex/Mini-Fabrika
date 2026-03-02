(function () {
  function findClickable(target) {
    return target && target.closest ? target.closest('a, button') : null;
  }

  function emit(eventName, payload) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, payload);
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: eventName }, payload));
    }
    if (window.console && typeof window.console.debug === 'function') {
      window.console.debug('[tracking]', eventName, payload);
    }
  }

  function onClick(event) {
    var el = findClickable(event.target);
    if (!el) return;

    var href = (el.getAttribute('href') || '').trim();
    var text = (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    var className = (el.className || '').toString();
    var payload = {
      page_path: window.location.pathname,
      link_url: href || window.location.href,
      cta_text: text || 'unknown'
    };

    if (/wa\.me|api\.whatsapp\.com/i.test(href) || el.hasAttribute('data-whatsapp-cta')) {
      emit('click_whatsapp', payload);
      return;
    }
    if (href.indexOf('tel:') === 0) {
      emit('click_call', payload);
      return;
    }
    if (href.indexOf('mailto:') === 0) {
      emit('click_email', payload);
      return;
    }

    if (/(teklif al|hızlı teklif al|teklif talebini gönder|teklif gönder)/i.test(text) || /btn-primary/.test(className)) {
      emit('click_cta', payload);
    }
  }

  document.addEventListener('click', onClick, { passive: true });
})();
