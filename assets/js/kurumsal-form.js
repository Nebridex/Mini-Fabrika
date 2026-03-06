(function () {
  function validateField(field) {
    var valid = field.checkValidity();
    field.classList.toggle('input-error', !valid);
    return valid;
  }

  function setLoading(button, loading) {
    if (!button) return;
    button.classList.toggle('is-loading', loading);
    button.disabled = loading;
    button.textContent = loading ? 'Gönderiliyor...' : 'Mesaj Gönder';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('.corporate-form');
    if (!form) return;

    var errorBox = form.querySelector('[data-form-error]');
    var successBox = form.querySelector('[data-form-success]');
    var submitBtn = form.querySelector('[data-submit-btn]');
    var requiredFields = Array.from(form.querySelectorAll('[required]'));

    errorBox.hidden = true;
    successBox.hidden = true;

    var params = new URLSearchParams(window.location.search);
    if (params.get('sent') === '1') {
      successBox.hidden = false;
      window.history.replaceState({}, '', window.location.pathname);
    }

    document.querySelectorAll('[data-scroll-target]').forEach(function (trigger) {
      trigger.addEventListener('click', function (event) {
        event.preventDefault();
        var id = trigger.getAttribute('data-scroll-target');
        var target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    requiredFields.forEach(function (field) {
      field.addEventListener('input', function () { validateField(field); });
      field.addEventListener('blur', function () { validateField(field); });
    });

    form.addEventListener('submit', function (event) {
      errorBox.hidden = true;
      successBox.hidden = true;
      errorBox.textContent = 'Lütfen zorunlu alanları kontrol edin.';

      var firstInvalid = requiredFields.find(function (field) { return !validateField(field); });
      if (firstInvalid) {
        event.preventDefault();
        errorBox.textContent = 'Lütfen zorunlu alanları tamamlayın ve izin kutusunu onaylayın.';
        errorBox.hidden = false;
        firstInvalid.focus();
        return;
      }

      setLoading(submitBtn, true);
    });
  });
})();
