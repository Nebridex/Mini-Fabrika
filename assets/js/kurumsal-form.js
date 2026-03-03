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
    button.textContent = loading ? 'Gönderiliyor...' : 'Gönder';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('.corporate-form');
    if (!form) return;

    var errorBox = form.querySelector('[data-form-error]');
    var successBox = form.querySelector('[data-form-success]');
    var submitBtn = form.querySelector('[data-submit-btn]');
    var requiredFields = Array.from(form.querySelectorAll('[required]'));

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
      event.preventDefault();
      errorBox.hidden = true;
      successBox.hidden = true;
      errorBox.textContent = 'Lütfen zorunlu alanları kontrol edin.';

      var isValid = requiredFields.map(validateField).every(Boolean);
      if (!isValid) {
        errorBox.hidden = false;
        return;
      }

      setLoading(submitBtn, true);

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Form request failed');
          return response.json();
        })
        .then(function () {
          successBox.hidden = false;
          form.reset();
          requiredFields.forEach(function (field) { field.classList.remove('input-error'); });
        })
        .catch(function () {
          errorBox.textContent = 'Gönderim sırasında bir hata oluştu. Lütfen tekrar deneyin veya info@minifabrika.com adresine yazın.';
          errorBox.hidden = false;
        })
        .finally(function () {
          setLoading(submitBtn, false);
        });
    });
  });
})();
