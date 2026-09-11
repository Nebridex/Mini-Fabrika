(function () {
  'use strict';

  var MAX_FILE_SIZE = 50 * 1024 * 1024;
  var ALLOWED_EXTENSION = /\.(stl|3mf|obj|zip)$/i;

  function messageBox(form) {
    var box = form.querySelector('[data-submit-message]');
    if (!box) {
      box = document.createElement('div');
      box.setAttribute('data-submit-message', '');
      box.setAttribute('role', 'alert');
      box.className = 'submission-message field-error';
      box.hidden = true;
      form.insertBefore(box, form.firstChild);
    }
    return box;
  }

  function showError(box, message) {
    box.textContent = message;
    box.className = 'submission-message field-error';
    box.hidden = false;
  }

  function successUrl(form, quoteId) {
    var target = form.getAttribute('data-success-url') || '/tesekkurler.html';
    var url = new URL(target, window.location.origin);
    url.searchParams.set('quote', quoteId);
    return url.toString();
  }

  function attach(form) {
    var fileInput = form.querySelector('input[type="file"][name="attachment"]');

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;

      var box = messageBox(form);
      var file = fileInput && fileInput.files && fileInput.files[0];
      if (file && !ALLOWED_EXTENSION.test(file.name)) {
        showError(box, 'Dosya yüklerseniz STL, 3MF, OBJ veya ZIP formatında olmalıdır.');
        return;
      }
      if (file && file.size > MAX_FILE_SIZE) {
        showError(box, 'Dosya boyutu en fazla 50 MB olabilir.');
        return;
      }

      var button = form.querySelector('button[type="submit"]');
      var originalText = button ? button.textContent : '';
      box.hidden = true;
      form.setAttribute('aria-busy', 'true');
      if (button) {
        button.disabled = true;
        button.textContent = 'Gönderiliyor…';
      }

      try {
        var response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });
        var result = await response.json().catch(function () { return {}; });
        if (!response.ok || !result.ok) {
          throw new Error(result.error || 'Talep gönderilemedi. Lütfen tekrar deneyin.');
        }
        if (!/^MF-\d{8}-[A-Z0-9]{5}$/.test(result.quoteId || '')) {
          throw new Error('Talep kaydedildi ancak talep numarası alınamadı. Lütfen bizimle iletişime geçin.');
        }
        window.location.assign(successUrl(form, result.quoteId));
      } catch (error) {
        showError(box, error && error.message ? error.message : 'Talep gönderilemedi. Lütfen tekrar deneyin.');
        form.removeAttribute('aria-busy');
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
        }
      }
    });
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('form[data-quote-form]'), attach);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
