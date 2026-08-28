(function () {
  var ATTR_KEY = 'minifabrika_attribution_v2';
  var QUOTE_CONTEXT_KEY = 'minifabrika_quote_context_v1';
  var CONVERSION_KEY = 'minifabrika_conversion_v2:';

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
    try { window.sessionStorage.setItem(key, value); } catch (error) {}
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
      try { return JSON.parse(existing); } catch (error) {}
    }

    var source = '';
    var medium = '';
    var campaign = params.get('utm_campaign') || '';
    var gclid = params.get('gclid') || '';
    var utmSource = params.get('utm_source') || '';
    var utmMedium = params.get('utm_medium') || '';

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
      landing_page: window.location.pathname,
      referrer_host: document.referrer ? (function () { try { return new URL(document.referrer).hostname; } catch (e) { return ''; } })() : '',
      gclid: gclid
    };

    safeSet(ATTR_KEY, JSON.stringify(attribution));
    return attribution;
  }

  function quantityBucket(value) {
    var qty = parseInt(value || '0', 10);
    if (!qty || qty < 2) return 'unknown';
    if (qty <= 9) return '2-9';
    if (qty <= 24) return '10-24';
    if (qty <= 49) return '25-49';
    if (qty <= 99) return '50-99';
    if (qty <= 249) return '100-249';
    return '250+';
  }

  function quoteContext(form) {
    var quantity = form.querySelector('#quantity');
    var sample = form.querySelector('#sampleQuantity');
    var service = form.querySelector('#serviceType');
    var material = form.querySelector('#material');
    var urgency = form.querySelector('#urgency');
    return {
      quantity_bucket: quantityBucket(quantity && quantity.value),
      sample_requested: Boolean(sample && parseInt(sample.value || '0', 10) > 0),
      sample_count: sample ? String(sample.value || '0') : '0',
      production_type: service ? String(service.value || 'unknown') : 'unknown',
      material: material ? String(material.value || 'unknown') : 'unknown',
      planning_priority: urgency ? String(urgency.value || 'unknown') : 'unknown'
    };
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
      ensureHiddenInput(form, 'lead_referrer_host', attribution.referrer_host);
      ensureHiddenInput(form, 'lead_gclid', attribution.gclid);

      var nextButton = form.querySelector('[data-step-next]');
      if (nextButton) {
        nextButton.addEventListener('click', function () {
          window.setTimeout(function () {
            var secondStep = form.querySelector('[data-step="2"]');
            if (secondStep && !secondStep.hidden) {
              emit('quote_requirements_complete', {
                page_path: window.location.pathname,
                traffic_source: attribution.source,
                traffic_medium: attribution.medium
              });
            }
          }, 0);
        });
      }

      form.addEventListener('submit', function () {
        var context = quoteContext(form);
        safeSet(QUOTE_CONTEXT_KEY, JSON.stringify(context));
        emit('quote_submit_attempt', Object.assign({
          page_path: window.location.pathname,
          traffic_source: attribution.source,
          traffic_medium: attribution.medium
        }, context));
      });
    });
  }

  function emitQuoteView() {
    if (window.location.pathname !== '/teklif.html') return;
    emit('quote_view', {
      traffic_source: attribution.source,
      traffic_medium: attribution.medium,
      traffic_campaign: attribution.campaign
    });
  }

  function emitConversionOnce() {
    if (window.location.pathname !== '/tesekkurler.html') return;
    var key = CONVERSION_KEY + window.location.pathname;
    if (safeGet(key)) return;
    safeSet(key, '1');

    var context = {};
    var raw = safeGet(QUOTE_CONTEXT_KEY);
    if (raw) {
      try { context = JSON.parse(raw); } catch (error) {}
    }

    emit('generate_lead', Object.assign({
      lead_type: 'batch_production_quote',
      traffic_source: attribution.source,
      traffic_medium: attribution.medium,
      traffic_campaign: attribution.campaign
    }, context));
  }

  function onClick(event) {
    var el = findClickable(event.target);
    if (!el) return;

    var href = (el.getAttribute('href') || '').trim();
    var text = (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    var className = (el.className || '').toString();
    var payload = {
      page_path: window.location.pathname,
      link_path: href && href.charAt(0) === '/' ? href.split('?')[0] : '',
      cta_text: text || 'unknown',
      traffic_source: attribution.source,
      traffic_medium: attribution.medium
    };

    if (/wa\.me|api\.whatsapp\.com/i.test(href) || el.hasAttribute('data-whatsapp-cta')) {
      emit('click_whatsapp', payload);
      return;
    }
    if (href.indexOf('mailto:') === 0) {
      emit('click_email', payload);
      return;
    }
    if (/(teklif|üretim talebi|dosyanı gönder|stl dosyanı gönder)/i.test(text) || /btn-primary/.test(className)) {
      emit('click_quote_cta', payload);
    }
  }

  document.addEventListener('click', onClick, { passive: true });

  function init() {
    attachAttributionToForms();
    emitQuoteView();
    emitConversionOnce();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
