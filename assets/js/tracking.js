(function () {
  var ATTR_KEY = 'minifabrika_attribution_v1';
  var CONVERSION_KEY = 'minifabrika_conversion_v1:';

  function findClickable(target) {
    return target && target.closest ? target.closest('a, button') : null;
  }

  function emit(eventName, payload) {
    payload = payload || {};
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

  function safeGet(key) {
    try { return window.sessionStorage.getItem(key); } catch (error) { return null; }
  }

  function safeSet(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch (error) { /* optional */ }
  }

  function referrerAttribution(referrer) {
    if (!referrer) return null;
    try {
      var url = new URL(referrer);
      var host = url.hostname.replace(/^www\./, '').toLowerCase();
      var currentHost = window.location.hostname.replace(/^www\./, '').toLowerCase();
      if (!host || host === currentHost) return null;
      if (/(^|\.)google\./.test(host)) return { source: 'google', medium: 'organic' };
      if (/(^|\.)bing\.com$/.test(host)) return { source: 'bing', medium: 'organic' };
      if (/(^|\.)yandex\./.test(host)) return { source: 'yandex', medium: 'organic' };
      if (/instagram\.com$/.test(host)) return { source: 'instagram', medium: 'referral' };
      if (/facebook\.com$|fb\.com$/.test(host)) return { source: 'facebook', medium: 'referral' };
      if (/linkedin\.com$/.test(host)) return { source: 'linkedin', medium: 'referral' };
      return { source: host, medium: 'referral' };
    } catch (error) {
      return null;
    }
  }

  function buildAttribution() {
    var params = new URLSearchParams(window.location.search || '');
    var existing = safeGet(ATTR_KEY);
    if (existing) {
      try { return JSON.parse(existing); } catch (error) { /* rebuild */ }
    }

    var campaign = params.get('utm_campaign') || '';
    var gclid = params.get('gclid') || '';
    var utmSource = params.get('utm_source') || '';
    var utmMedium = params.get('utm_medium') || '';
    var source = '';
    var medium = '';

    if (utmSource) {
      source = utmSource;
      medium = utmMedium || 'campaign';
    } else if (gclid) {
      source = 'google';
      medium = 'cpc';
    } else {
      var referral = referrerAttribution(document.referrer);
      if (referral) {
        source = referral.source;
        medium = referral.medium;
      } else {
        source = 'direct';
        medium = '(none)';
      }
    }

    var attribution = {
      source: source,
      medium: medium,
      campaign: campaign,
      landing_page: window.location.pathname + window.location.search,
      referrer: document.referrer || '',
      gclid: gclid
    };
    safeSet(ATTR_KEY, JSON.stringify(attribution));
    return attribution;
  }

  var attribution = buildAttribution();
  window.minifabrikaAttribution = attribution;

  function ensureHiddenInput(form, name, value) {
    var input = form.querySelector('input[name="' + name + '"]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    input.value = value || '';
  }

  function attachAttributionToForms() {
    var forms = document.querySelectorAll('form[action*="formsubmit.co"]');
    Array.prototype.forEach.call(forms, function (form) {
      ensureHiddenInput(form, 'lead_source', attribution.source);
      ensureHiddenInput(form, 'lead_medium', attribution.medium);
      ensureHiddenInput(form, 'lead_campaign', attribution.campaign);
      ensureHiddenInput(form, 'lead_landing_page', attribution.landing_page);
      ensureHiddenInput(form, 'lead_referrer', attribution.referrer);
      ensureHiddenInput(form, 'lead_gclid', attribution.gclid);
      form.addEventListener('submit', function () {
        emit('form_submit_attempt', {
          page_path: window.location.pathname,
          lead_type: form.classList.contains('corporate-form') ? 'corporate' : 'quote',
          traffic_source: attribution.source,
          traffic_medium: attribution.medium
        });
      });
    });
  }

  function emitConversionOnce() {
    var params = new URLSearchParams(window.location.search || '');
    var leadType = '';
    if (window.location.pathname === '/tesekkurler.html') leadType = 'quote';
    if (/^\/kurumsal\/?$/.test(window.location.pathname) && params.get('sent') === '1') leadType = 'corporate';
    if (!leadType) return;
    var key = CONVERSION_KEY + leadType + ':' + window.location.pathname + window.location.search;
    if (safeGet(key)) return;
    safeSet(key, '1');
    emit('generate_lead', {
      lead_type: leadType,
      traffic_source: attribution.source,
      traffic_medium: attribution.medium,
      traffic_campaign: attribution.campaign
    });
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
      cta_text: text || 'unknown',
      traffic_source: attribution.source,
      traffic_medium: attribution.medium
    };
    if (/wa\.me|api\.whatsapp\.com/i.test(href) || el.hasAttribute('data-whatsapp-cta')) { emit('click_whatsapp', payload); return; }
    if (href.indexOf('tel:') === 0) { emit('click_call', payload); return; }
    if (href.indexOf('mailto:') === 0) { emit('click_email', payload); return; }
    if (/(teklif al|hızlı teklif al|teklif talebini gönder|teklif gönder|3d baskı teklifi)/i.test(text) || /btn-primary/.test(className)) emit('click_cta', payload);
  }

  document.addEventListener('click', onClick, { passive: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { attachAttributionToForms(); emitConversionOnce(); });
  } else {
    attachAttributionToForms();
    emitConversionOnce();
  }
})();
