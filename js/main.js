// C'EST COINCHÉ — site interactions (vanilla JS)
document.addEventListener('DOMContentLoaded', () => {

  /* ---- Smooth nav scroll ---- */
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      const target = document.getElementById(el.dataset.nav);
      if (target) window.scrollTo({ top: target.offsetTop - 60, behavior: 'smooth' });
    });
  });

});
