/* app-enhance.js
   Micro-interazioni non invasive, separate da app.js:
   - reveal-on-scroll per gli elementi con classe .reveal
   Se qualcosa va storto (browser vecchio, script bloccato) il
   <noscript> nell'head di ogni pagina forza comunque opacity:1,
   quindi il contenuto resta sempre visibile e leggibile. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  els.forEach(function (el) { io.observe(el); });
})();
