(function () {
  function qs(selector, root) { return (root || document).querySelector(selector); }

  function serializeForm(form) {
    var data = new FormData(form);
    var payload = {};
    data.forEach(function (value, key) {
      payload[key] = value;
    });
    return payload;
  }

  function setStatus(form, type, text) {
    var box = qs('[data-form-status]', form);
    if (!box) return;
    box.hidden = false;
    box.className = 'form-status ' + type;
    box.textContent = text;
  }

  function validateForm(form) {
    var email = qs('input[name="email"]', form);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      email.setCustomValidity('Lütfen geçerli bir e-posta adresi girin.');
      email.reportValidity();
      return false;
    }
    if (email) email.setCustomValidity('');
    return form.checkValidity();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var endpoint = window.MINIFAB_CONFIG && window.MINIFAB_CONFIG.FORM_ENDPOINT;
    var forms = document.querySelectorAll('form[data-formspree-form]');

    forms.forEach(function (form) {
      if (endpoint) {
        form.setAttribute('action', endpoint);
      }

      form.addEventListener('submit', function (event) {
        event.preventDefault();

        var gotcha = qs('input[name="_gotcha"]', form);
        if (gotcha && gotcha.value.trim()) return;

        if (!validateForm(form)) {
          form.reportValidity();
          return;
        }

        var submitButton = qs('button[type="submit"]', form);
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Gönderiliyor...';
        }

        var payload = serializeForm(form);

        fetch(form.getAttribute('action'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        }).then(function (response) {
          if (!response.ok) throw new Error('Form gönderimi başarısız oldu.');
          form.reset();
          setStatus(form, 'success', 'Teşekkürler! Talebini aldık. 24 saat içinde dönüş yapacağız.');
        }).catch(function () {
          setStatus(form, 'error', 'Üzgünüz, gönderim sırasında bir hata oluştu. Lütfen tekrar deneyin veya info@minifabrika.com adresine yazın.');
        }).finally(function () {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Teklif Talebini Gönder';
          }
        });
      });
    });
  });
})();
