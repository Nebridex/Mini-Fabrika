(function () {
  function validateField(field) {
    var valid = field.checkValidity();
    field.classList.toggle('input-error', !valid);
    return valid;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('.corporate-form');
    if (!form) return;

    var errorBox = form.querySelector('[data-form-error]');
    var successBox = form.querySelector('[data-form-success]');
    var requiredFields = Array.from(form.querySelectorAll('[required]'));

    requiredFields.forEach(function (field) {
      field.addEventListener('input', function () {
        validateField(field);
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      errorBox.hidden = true;
      successBox.hidden = true;

      var isValid = requiredFields.map(validateField).every(Boolean);
      if (!isValid) {
        errorBox.hidden = false;
        return;
      }

      successBox.hidden = false;
      form.reset();
      requiredFields.forEach(function (field) {
        field.classList.remove('input-error');
      });
    });
  });
})();
