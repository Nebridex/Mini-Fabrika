(function () {
  var GA_MEASUREMENT_ID = 'G-SGLPG3FT3V';
  var ATTR_KEY = 'minifabrika_attribution_v2';
  var QUOTE_CONTEXT_KEY = 'minifabrika_quote_context_v1';
  var CONVERSION_KEY = 'minifabrika_conversion_v2:';

  function initGA4() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: true, transport_type: 'beacon' });
    if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
      document.head.appendChild(script);
    }
  }

  initGA4();

  function emit(eventName, payload) {
    payload = payload || {};
    if (typeof window.gtag === 'function') window.gtag('event', eventName, payload);
    else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: eventName }, payload));
    }
    if (window.console && typeof window.console.debug === 'function') window.console.debug('[tracking]', eventName, payload);
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
    } catch (error) { return null; }
  }

  function buildAttribution() {
    var params = new URLSearchParams(window.location.search || '');
    var existing = safeGet(ATTR_KEY);
    if (existing) {
      try { return JSON.parse(existing); } catch (error) {}
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
    var sample = form.querySelector('#sampleQuantity, #sample');
    var service = form.querySelector('#serviceType, #productionType');
    var material = form.querySelector('#material');
    var urgency = form.querySelector('#urgency');
    return {
      quantity_bucket: quantityBucket(quantity && quantity.value),
      sample_requested: Boolean(sample && String(sample.value || '0') !== '0' && String(sample.value || '') !== 'no'),
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

  function ensureStylesheet(fragment, href) {
    if (document.querySelector('link[href*="' + fragment + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureSimpleStyles() {
    ensureStylesheet('simple-site.css', '/assets/css/simple-site.css?v=20260901-1');
    ensureStylesheet('ui-fixes.css', '/assets/css/ui-fixes.css?v=20260829-4');
  }

  function rewriteLegacyLinks() {
    Array.prototype.forEach.call(document.querySelectorAll('a[href="/islerimiz.html"],a[href="islerimiz.html"]'), function (link) {
      link.href = '/#uretim';
      if (/işlerimiz|örnek/i.test(link.textContent || '')) link.textContent = 'Üretim Alanları';
    });
    Array.prototype.forEach.call(document.querySelectorAll('a[href="/malzeme-uretim.html"],a[href="malzeme-uretim.html"]'), function (link) {
      link.href = '/blog/malzeme-secimi-rehberi.html';
    });
  }

  function activeSection() {
    var path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/teklif.html') return 'quote';
    if (path === '/sorular.html') return 'questions';
    if (path === '/hakkimizda.html') return 'about';
    if (path === '/blog' || path === '/blog/index.html' || path.indexOf('/blog/') === 0) return 'guides';
    return 'production';
  }

  function navLink(href, label, key, active, extraClass) {
    var classes = [];
    if (extraClass) classes.push(extraClass);
    if (key === active) classes.push('active');
    return '<a' + (classes.length ? ' class="' + classes.join(' ') + '"' : '') + (key === active ? ' aria-current="page"' : '') + ' href="' + href + '">' + label + '</a>';
  }

  function normalizePrimaryNavigation() {
    var nav = document.querySelector('.topbar nav');
    if (!nav) return;
    var active = activeSection();
    nav.classList.add('simple-nav');
    nav.innerHTML =
      navLink('/#uretim', 'Üretim', 'production', active) +
      navLink('/blog/index.html', 'Rehberler', 'guides', active) +
      navLink('/hakkimizda.html', 'Hakkımızda', 'about', active) +
      navLink('/sorular.html', 'Soru Sor', 'questions', active) +
      navLink('/teklif.html#teklif-form', 'Teklif Al', 'quote', active, 'nav-cta');
  }

  function ensureFooterNavigation() {
    var footer = document.querySelector('footer .container');
    if (!footer) return;
    var nav = footer.querySelector('.site-footer-nav') || footer.querySelector('.socials') || footer.querySelector('.footer-actions');
    if (!nav) {
      nav = document.createElement('div');
      nav.className = 'socials site-footer-nav';
      footer.appendChild(nav);
    } else {
      nav.classList.add('site-footer-nav');
    }

    var links = [
      ['/hakkimizda.html', 'Hakkımızda'],
      ['/hakkimizda.html#iletisim', 'İletişim'],
      ['/blog/index.html', 'Rehberler'],
      ['/sorular.html', 'Soru Sor'],
      ['/teklif.html#teklif-form', 'Teklif Al']
    ];
    links.forEach(function (item) {
      if (nav.querySelector('a[href="' + item[0] + '"]')) return;
      var a = document.createElement('a');
      a.href = item[0];
      a.textContent = item[1];
      nav.appendChild(a);
    });
  }

  function injectArticleCommentForm() {
    if (!/^\/blog\/.+\.html$/.test(window.location.pathname) || window.location.pathname === '/blog/index.html' || window.location.pathname === '/blog/soru-alindi.html') return;
    var article = document.querySelector('.blog-article');
    if (!article || article.querySelector('.article-comments')) return;

    var section = document.createElement('section');
    section.className = 'article-comments';
    section.id = 'yorumlar';
    var nextUrl = window.location.origin + window.location.pathname + '?yorum=alindi#yorumlar';
    var success = new URLSearchParams(window.location.search).get('yorum') === 'alindi';
    section.innerHTML =
      (success ? '<div class="submission-success">Teşekkürler. Yorumunuz bize ulaştı; kontrol sonrası yayına uygun yorumları makaleye ekliyoruz.</div>' : '') +
      '<h2>Yorum veya soru bırakın</h2>' +
      '<p class="comment-note">Makaleyle ilgili sorunuzu ya da deneyiminizi yazabilirsiniz. E-posta adresiniz yayınlanmaz. Yorumlar otomatik yayınlanmaz.</p>' +
      '<form class="article-comment-form" action="https://formsubmit.co/info@minifabrika.com" method="POST">' +
      '<input type="hidden" name="_subject" value="MiniFabrika makale yorumu: ' + document.title.replace(/"/g, '&quot;') + '">' +
      '<input type="hidden" name="_next" value="' + nextUrl + '">' +
      '<input type="hidden" name="_template" value="table"><input type="hidden" name="_captcha" value="false">' +
      '<input type="hidden" name="article_url" value="' + window.location.href.split('?')[0] + '">' +
      '<label>İsim<input name="name" type="text" maxlength="80" required autocomplete="name"></label>' +
      '<label>E-posta <span class="muted">(opsiyonel, yayınlanmaz)</span><input name="email" type="email" autocomplete="email"></label>' +
      '<label>Yorumunuz / Sorunuz<textarea name="comment" rows="5" maxlength="1600" required></textarea></label>' +
      '<button class="btn btn-primary" type="submit">Gönder</button></form>';
    article.appendChild(section);
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
            if (secondStep && !secondStep.hidden) emit('quote_requirements_complete', { page_path: window.location.pathname, traffic_source: attribution.source, traffic_medium: attribution.medium });
          }, 0);
        });
      }

      form.addEventListener('submit', function () {
        if (window.location.pathname === '/teklif.html') {
          var context = quoteContext(form);
          safeSet(QUOTE_CONTEXT_KEY, JSON.stringify(context));
          var payload = Object.assign({ page_path: window.location.pathname, traffic_source: attribution.source, traffic_medium: attribution.medium }, context);
          emit('quote_submit_attempt', payload);
          emit('form_submit_attempt', payload);
        } else {
          emit('content_form_submit', {
            page_path: window.location.pathname,
            form_type: form.classList.contains('article-comment-form') ? 'article_comment' : (form.classList.contains('corporate-form') ? 'corporate_quote' : 'question'),
            traffic_source: attribution.source,
            traffic_medium: attribution.medium
          });
          if (form.classList.contains('corporate-form')) {
            emit('form_submit_attempt', { page_path: window.location.pathname, lead_type: 'corporate', traffic_source: attribution.source, traffic_medium: attribution.medium });
          }
        }
      });
    });
  }

  function emitQuoteView() {
    if (window.location.pathname !== '/teklif.html') return;
    emit('quote_view', { traffic_source: attribution.source, traffic_medium: attribution.medium, traffic_campaign: attribution.campaign });
  }

  function emitConversionOnce() {
    var params = new URLSearchParams(window.location.search || '');
    var leadType = '';
    if (window.location.pathname === '/tesekkurler.html') leadType = 'batch_production_quote';
    if (/^\/kurumsal\/?$/.test(window.location.pathname) && params.get('sent') === '1') leadType = 'corporate';
    if (!leadType) return;

    var key = CONVERSION_KEY + leadType + ':' + window.location.pathname + window.location.search;
    if (safeGet(key)) return;
    safeSet(key, '1');

    var context = {};
    var raw = safeGet(QUOTE_CONTEXT_KEY);
    if (raw) { try { context = JSON.parse(raw); } catch (error) {} }
    emit('generate_lead', Object.assign({ lead_type: leadType, traffic_source: attribution.source, traffic_medium: attribution.medium, traffic_campaign: attribution.campaign }, context));
  }

  function findClickable(target) {
    return target && target.closest ? target.closest('a, button') : null;
  }

  function onClick(event) {
    var el = findClickable(event.target);
    if (!el) return;
    var href = (el.getAttribute('href') || '').trim();
    var text = (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    var className = (el.className || '').toString();
    var payload = { page_path: window.location.pathname, link_path: href && href.charAt(0) === '/' ? href.split('?')[0] : '', cta_text: text || 'unknown', traffic_source: attribution.source, traffic_medium: attribution.medium };

    if (/wa\.me|api\.whatsapp\.com/i.test(href) || el.hasAttribute('data-whatsapp-cta')) { emit('click_whatsapp', payload); return; }
    if (href.indexOf('mailto:') === 0) { emit('click_email', payload); return; }
    if (/(teklif|üretim talebi|dosyanı gönder|stl dosyanı gönder|dosyayı gönder)/i.test(text) || /btn-primary/.test(className)) {
      emit('click_quote_cta', payload);
      emit('click_cta', payload);
    }
  }

  document.addEventListener('click', onClick, { passive: true });

  function init() {
    ensureSimpleStyles();
    rewriteLegacyLinks();
    normalizePrimaryNavigation();
    ensureFooterNavigation();
    injectArticleCommentForm();
    attachAttributionToForms();
    emitQuoteView();
    emitConversionOnce();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
