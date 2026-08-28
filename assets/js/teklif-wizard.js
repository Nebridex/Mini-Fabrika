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

  function localToday() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
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
    var quantity = q('#quantity', form);
    var sampleQuantity = q('#sampleQuantity', form);
    var targetDate = q('#targetDate', form);
    var hintBox = q('[data-dynamic-hint]', form);

    if (!step1 || !step2 || !next || !back || !submitBtn) return;

    if (targetDate) targetDate.min = localToday();

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
      var validLink = !hasLink || modelLink.checkValidity();
      var hasFile = modelFile && modelFile.files && modelFile.files.length > 0;
      var ok = (hasFile || hasLink) && validLink;

      if (modelError) {
        modelError.textContent = hasLink && !validLink
          ? 'Bağlantı http:// veya https:// ile başlayan geçerli bir adres olmalıdır.'
          : 'Lütfen üretime hazır dosyayı yükleyin veya erişilebilir bir model/dosya bağlantısı girin.';
        modelError.hidden = ok;
      }
      if (modelLink) modelLink.classList.toggle('has-error', !ok);
      if (modelFile) modelFile.classList.toggle('has-error', !ok);
      return ok;
    }

    function validationMessage(input) {
      if (input.id === 'quantity') return 'Planlanan toplam adet en az 2 olmalıdır.';
      if (input.type === 'email') return 'Geçerli bir e-posta adresi girin.';
      if (input.type === 'tel') return 'Teklif dönüşü için telefon numaranızı girin.';
      if (input.type === 'checkbox') return 'Devam etmek için bu onayı vermeniz gerekiyor.';
      return 'Bu alan teklif hazırlığı için zorunludur.';
    }

    function validRequired(container) {
      var ok = true;
      qa('[required]', container).forEach(function (input) {
        var hasValue = input.type === 'checkbox' ? input.checked : String(input.value || '').trim() !== '';
        var valid = hasValue && input.checkValidity();
        setInvalid(input, valid ? '' : validationMessage(input));
        if (!valid) ok = false;
      });
      return ok;
    }

    function updateHint() {
      if (!hintBox) return;
      var serviceVal = service && service.value ? service.value : 'Üretim türü seçilmedi';
      var materialVal = material && material.value ? material.value : 'Malzeme seçilmedi';
      var qty = quantity && quantity.value ? parseInt(quantity.value, 10) : 0;
      var sampleQty = sampleQuantity && sampleQuantity.value ? parseInt(sampleQuantity.value, 10) : 0;
      var cityVal = city && city.value ? city.value.trim() : 'Şehir belirtilmedi';
      var urgencyVal = 'Standart / Esnek';
      if (urgency && urgency.value === 'date-critical') urgencyVal = 'Belirli tarihe yetişmeli';
      if (urgency && urgency.value === 'urgent') urgencyVal = 'Öncelikli değerlendirme';

      var notes = [];
      if (sampleQty > 0) notes.push(sampleQty + ' adet numune talebi, ana üretimden önce ayrı planlanacaktır.');
      if (qty >= 50) notes.push('Yüksek adet için tabla yerleşimi ve tekrarlı üretim optimizasyonu ayrıca değerlendirilecektir.');
      if (materialVal === 'ABS') notes.push('ABS için geometri ve warping riski teknik kontrolde ayrıca incelenecektir.');
      if (materialVal === 'TPU') notes.push('TPU üretiminde tolerans ve parça geometrisi teslim süresini etkileyebilir.');
      if (materialVal.indexOf('Bilmiyorum') === 0) notes.push('Kullanım amacına göre malzeme önerisini teklifle birlikte paylaşacağız.');
      if (urgency && urgency.value !== 'standard') notes.push('Hedef termin kapasite ve baskı süresi görüldükten sonra teyit edilecektir.');
      if (!notes.length) notes.push('Dosya teknik kontrolden geçtikten sonra birim fiyat ve gerçekçi termin paylaşılacaktır.');

      hintBox.innerHTML = '<p class="form-note" style="margin:0;"><strong>Talep özeti:</strong> ' +
        serviceVal + ' · ' + (qty ? qty + ' adet' : 'Adet girilmedi') + ' · ' + materialVal + ' · ' + cityVal + ' · ' + urgencyVal +
        '<br>' + notes.join(' ') + '</p>';
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

    [material, city, service, urgency, quantity, sampleQuantity, targetDate].forEach(function (el) {
      if (!el) return;
      el.addEventListener(el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input', function () {
        updateHint();
        if (el === quantity) setInvalid(quantity, quantity.checkValidity() ? '' : 'Planlanan toplam adet en az 2 olmalıdır.');
      });
    });

    next.addEventListener('click', function () {
      var validStep1 = validRequired(step1);
      var validStep1Model = validModel();
      if (!validStep1 || !validStep1Model) {
        if (errorBanner) {
          errorBanner.hidden = false;
          errorBanner.textContent = !validStep1
            ? 'Üretim türünü ve üretime hazır dosya onayını kontrol edin.'
            : 'Devam etmek için üretime hazır dosya veya erişilebilir bağlantı ekleyin.';
        }
        return;
      }
      if (errorBanner) errorBanner.hidden = true;
      setStep(2);
      updateHint();
    });

    back.addEventListener('click', function () {
      setStep(1);
    });

    form.addEventListener('submit', function (event) {
      var ok1Fields = validRequired(step1);
      var ok1Model = validModel();
      var ok2 = validRequired(step2);
      if (!ok1Fields || !ok1Model || !ok2) {
        event.preventDefault();
        if (successBanner) successBanner.hidden = true;
        if (errorBanner) {
          errorBanner.hidden = false;
          errorBanner.textContent = !ok1Fields
            ? 'Üretim türünü ve dosya onayını kontrol edin.'
            : !ok1Model
              ? 'Üretime hazır dosya veya erişilebilir bağlantı olmadan teklif gönderilemez.'
              : 'Lütfen üretim ve iletişim bilgilerindeki zorunlu alanları kontrol edin.';
        }
        setStep(ok1Fields && ok1Model ? 2 : 1);
        return;
      }
      if (errorBanner) errorBanner.hidden = true;
      if (successBanner) successBanner.hidden = false;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Gönderiliyor...';
    });

    setStep(1);
    updateHint();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
