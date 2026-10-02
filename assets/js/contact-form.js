(function () {
  'use strict';

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

  function submitHandler(event) {
    var form = event.target && event.target.closest
      ? event.target.closest('form[data-contact-form]')
      : null;
    if (!form) return;

    event.preventDefault();
    if (!form.reportValidity()) return;

    var box = messageBox(form);
    var button = form.querySelector('button[type="submit"]');
    var originalText = button ? button.textContent : '';
    box.hidden = true;
    form.setAttribute('aria-busy', 'true');

    if (button) {
      button.disabled = true;
      button.textContent = 'Gönderiliyor…';
    }

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (result) {
          if (!response.ok || !result.ok) {
            throw new Error(result.error || 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
          }
          return result;
        });
      })
      .then(function () {
        var target = form.getAttribute('data-success-url');
        if (target) {
          window.location.assign(new URL(target, window.location.origin).toString());
          return;
        }
        form.reset();
        box.textContent = 'Teşekkürler. Mesajınız bize ulaştı.';
        box.className = 'submission-message submission-success';
        box.hidden = false;
      })
      .catch(function (error) {
        var isNetworkError = error instanceof TypeError || (error && error.message === 'Failed to fetch');
        showError(
          box,
          isNetworkError
            ? 'Sunucuya ulaşılamadı. Mesajınız gönderilmedi. Lütfen tekrar deneyin veya info@minifabrika.com adresine yazın.'
            : (error && error.message ? error.message : 'Mesaj gönderilemedi. Lütfen tekrar deneyin.')
        );
      })
      .finally(function () {
        form.removeAttribute('aria-busy');
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
        }
      });
  }

  document.addEventListener('submit', submitHandler);
})();
