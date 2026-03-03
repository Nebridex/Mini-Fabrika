(function () {
  var STORAGE_KEY = 'minifabrikaExperience';
  var FADE_MS = 220;

  function navigateWithExperience(value, href) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      // noop
    }
    document.body.classList.add('is-fading-out');
    window.setTimeout(function () {
      window.location.href = href;
    }, FADE_MS);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.add('fade-page');

    document.addEventListener('click', function (event) {
      var link = event.target.closest('[data-experience-link]');
      if (!link) return;
      event.preventDefault();
      navigateWithExperience(link.dataset.experienceLink, link.getAttribute('href'));
    });
  });
})();
