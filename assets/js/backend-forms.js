(function () {
  'use strict';

  var API_URL = 'https://api.minifabrika.com/v1/requests';

  function messageBox(form) {
    var box = form.querySelector('[data-submit-message]');
    if (!box) {
      box = document.createElement('div');
      box.setAttribute('data-submit-message', '');
      box.setAttribute('role', 'alert');
      box.className = 'submission-message';
      box.hidden = true;
      form.insertBefore(box, form.firstChild);
    }
    return box;
  }

  function successUrl(form, requestId) {
    var template = form.getAttribute('data-success-url') || '/tesekkurler.html';
    var url = new URL(template, window.location.origin);
    url.searchParams.set('id', requestId);
    return url.toString();
  }

  function attach(form) {
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      var box = messageBox(form);
      var button = form.querySelector('button[type="submit"]');
      var originalText = button ? button.textContent : '';
      box.hidden = true;
      if (button) {
        button.disabled = true;
        button.textContent = 'Gönderiliyor…';
      }
      try {
        var response = await fetch(API_URL, { method: 'POST', body: new FormData(form) });
        var result = await response.json().catch(function () { return {}; });
        if (!response.ok || !result.ok) throw new Error(result.message || 'Talep gönderilemedi. Lütfen tekrar deneyin.');
        window.location.assign(successUrl(form, result.requestId));
      } catch (error) {
        box.textContent = error.message || 'Talep gönderilemedi. Lütfen tekrar deneyin.';
        box.className = 'submission-message field-error';
        box.hidden = false;
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
        }
      }
    });
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('form[data-backend-form]'), attach);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
