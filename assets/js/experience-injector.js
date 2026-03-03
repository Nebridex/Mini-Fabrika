(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var topbarInner = document.querySelector('.topbar .topbar-inner');
    if (!topbarInner || topbarInner.querySelector('.experience-switch')) {
      return;
    }

    var switcher = document.createElement('nav');
    switcher.className = 'experience-switch';
    switcher.setAttribute('aria-label', 'Deneyim değiştir');
    switcher.innerHTML = '<a href="/kurumsal/" data-experience-link="kurumsal">Kurumsal</a><a href="/bireysel/" data-experience-link="bireysel" class="active">Bireysel</a>';
    topbarInner.appendChild(switcher);
  });
})();
