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
    var errorBanner = q('[data-form-error]', form);
    var successBanner = q('[data-form-success]', form);
    var material = q('#material', form);
    var city = q('#deliveryCity', form);
    var service = q('#serviceType', form);
    var urgency = q('#urgency', form);
    var hintBox = q('[data-dynamic-hint]', form);
    var deliveryOutput = q('[data-delivery-output]', form);

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
        setInvalid(input, valid ? '' : 'Bu alanı doldurursanız size daha hızlı ve net teklif dönebiliriz.');
        if (!valid) ok = false;
      });
      return ok;
    }

    function updateDeliveryHint() {
      if (!deliveryOutput || !city) return;
      var val = city.value;
      if (val === 'istanbul') deliveryOutput.textContent = 'İstanbul: üretim + teslimat genelde 2-5 iş günü aralığında planlanır.';
      else if (val === 'ankara' || val === 'izmir') deliveryOutput.textContent = 'Ankara/İzmir: üretim + kargo genelde 3-6 iş günü aralığında planlanır.';
      else if (val === 'other') deliveryOutput.textContent = 'Diğer şehirler: kargo süresine bağlı olarak genelde 4-7 iş günü aralığı öngörülür.';
      else deliveryOutput.textContent = 'Şehir seçtiğinizde tahmini aralık gösterilir.';
    }

    function updateHint() {
      if (!hintBox) return;
      var serviceVal = service && service.value ? service.value : 'Hizmet seçilmedi';
      var materialVal = material && material.value ? material.value : 'Malzeme seçilmedi';
      var cityVal = city && city.value ? city.options[city.selectedIndex].text : 'Şehir seçilmedi';
      var urgencyVal = urgency && urgency.value === 'rush' ? 'Hızlı üretim' : 'Standart termin';
      var notes = [];

      if (materialVal === 'ABS') notes.push('ABS taleplerinde büzülme/warping riskine karşı ek teknik kontrol yapıyoruz.');
      if (materialVal === 'TPU') notes.push('TPU daha esnek bir malzemedir; istenen sertlik ve kullanım amacı mutlaka not edilmelidir.');
      if (city && city.value === 'istanbul') notes.push('İstanbul gönderilerinde planlama daha esnek yapılabilir.');
      if (urgency && urgency.value === 'rush') notes.push('Hızlı üretim kapasite doğrulamasına bağlıdır; kesin tarih teklifte netleşir.');
      if (!notes.length) notes.push('Kullanım amacını detaylandırmanız malzeme önerimizin doğruluğunu artırır.');

      hintBox.innerHTML = '<p class="form-note" style="margin:0;"><strong>Üretim notu:</strong> ' +
        serviceVal + ' · ' + materialVal + ' · ' + cityVal + ' · ' + urgencyVal + '<br>' + notes.join(' ') + '</p>';
    }

    if (phone) {
      phone.addEventListener('input', function () {
        var d = phone.value.replace(/\D/g, '').slice(0, 11);
        if (!d) return;
        var n = d.charAt(0) === '0' ? d : ('0' + d.slice(0, 10));
        phone.value = [n.slice(0, 4), n.slice(4, 7), n.slice(7, 9), n.slice(9, 11)].filter(Boolean).join(' ');
      });
    }

    [modelLink, modelFile].forEach(function (el) {
      if (!el) return;
      el.addEventListener(el === modelFile ? 'change' : 'input', validModel);
    });

    [material, city, service, urgency].forEach(function (el) {
      if (!el) return;
      el.addEventListener('change', function () {
        updateHint();
        updateDeliveryHint();
      });
    });

    next.addEventListener('click', function () {
      if (!validModel()) {
        if (errorBanner) {
          errorBanner.hidden = false;
          errorBanner.textContent = 'Devam edebilmek için model linki veya bir dosya ekleyin. İkisi de olabilir.';
        }
        return;
      }
      if (errorBanner) errorBanner.hidden = true;
      setStep(2);
      updateHint();
      updateDeliveryHint();
    });

    back.addEventListener('click', function () {
      setStep(1);
    });

    form.addEventListener('submit', function (event) {
      var ok1 = validModel();
      var ok2 = validRequired(step2);
      if (!ok1 || !ok2) {
        event.preventDefault();
        if (successBanner) successBanner.hidden = true;
        if (errorBanner) {
          errorBanner.hidden = false;
          errorBanner.textContent = !ok1
            ? 'Teklif hazırlayabilmemiz için model linki veya dosyası gerekiyor.'
            : 'Birkaç zorunlu alan eksik görünüyor. Tamamlayıp tekrar gönderebilirsiniz.';
        }
        setStep(ok1 ? 2 : 1);
        return;
      }
      if (errorBanner) errorBanner.hidden = true;
      if (successBanner) {
        successBanner.hidden = false;
        successBanner.textContent = 'Formunuz gönderiliyor. Talebinizi aldığımızda e-posta üzerinden teknik geri dönüş yapacağız.';
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Gönderiliyor...';
    });

    setStep(1);
    updateHint();
    updateDeliveryHint();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
