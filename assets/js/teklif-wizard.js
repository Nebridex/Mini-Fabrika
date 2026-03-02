(function () {
  function q(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function setInvalid(el, message) {
    var error = el.nextElementSibling && el.nextElementSibling.classList && el.nextElementSibling.classList.contains('field-error')
      ? el.nextElementSibling
      : null;
    if (!error) {
      error = document.createElement('small');
      error.className = 'field-error';
      el.insertAdjacentElement('afterend', error);
    }
    if (message) {
      el.classList.add('has-error');
      el.setAttribute('aria-invalid', 'true');
      error.textContent = message;
      error.hidden = false;
    } else {
      el.classList.remove('has-error');
      el.removeAttribute('aria-invalid');
      error.hidden = true;
    }
  }

  function init() {
    var form = q('.quote-form');
    if (!form) return;

    var step1 = q('[data-step="1"]', form);
    var step2 = q('[data-step="2"]', form);
    var stages = qa('.wizard-stage-item', form.parentNode);
    var next = q('[data-step-next]', form);
    var back = q('[data-step-back]', form);
    var submitBtn = q('button[type="submit"]', form);
    var modelLink = q('#modelLink', form);
    var modelFile = q('#modelFile', form);
    var modelError = q('[data-model-error]', form);
    var phone = q('#phone', form);

    if (!step1 || !step2 || !next || !back || !submitBtn) return;

    function setStep(step) {
      step1.hidden = step !== 1;
      step2.hidden = step !== 2;
      stages.forEach(function (item, idx) {
        item.classList.toggle('is-active', idx + 1 === step);
        item.classList.toggle('is-complete', idx + 1 < step);
      });
    }

    function validModel() {
      var hasLink = modelLink && modelLink.value.trim().length > 0;
      var hasFile = modelFile && modelFile.files && modelFile.files.length > 0;
      var ok = hasLink || hasFile;
      if (modelError) modelError.hidden = ok;
      if (modelLink) modelLink.classList.toggle('has-error', !ok);
      if (modelFile) modelFile.classList.toggle('has-error', !ok);
      return ok;
    }

    function validRequired(container) {
      var ok = true;
      qa('[required]', container).forEach(function (input) {
        var valid = input.type === 'checkbox' ? input.checked : input.value.trim() !== '';
        setInvalid(input, valid ? '' : 'Bu alan zorunludur.');
        if (!valid) ok = false;
      });
      return ok;
    }

    if (phone) {
      phone.addEventListener('input', function () {
        var d = phone.value.replace(/\D/g, '').slice(0, 11);
        if (!d) return;
        var n = d.charAt(0) === '0' ? d : ('0' + d.slice(0, 10));
        phone.value = [n.slice(0, 4), n.slice(4, 7), n.slice(7, 9), n.slice(9, 11)].filter(Boolean).join(' ');
      });
    }

    if (modelLink) modelLink.addEventListener('input', validModel);
    if (modelFile) modelFile.addEventListener('change', validModel);

    next.addEventListener('click', function () {
      if (!validModel()) return;
      setStep(2);
    });

    back.addEventListener('click', function () {
      setStep(1);
    });

    form.addEventListener('submit', function (event) {
      var ok1 = validModel();
      var ok2 = validRequired(step2);
      if (!ok1 || !ok2) {
        event.preventDefault();
        setStep(ok1 ? 2 : 1);
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Gönderiliyor...';
    });

    setStep(1);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
