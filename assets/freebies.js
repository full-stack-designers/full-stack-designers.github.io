/* Buttons with data-why open the matching <dialog>; a click on the backdrop closes it.
   Any video inside a dialog stops when the dialog closes. */
document.querySelectorAll('[data-why]').forEach(function (btn) {
  var d = document.getElementById(btn.getAttribute('data-why'));
  if (!d || typeof d.showModal !== 'function') return;
  btn.addEventListener('click', function () {
    d.querySelectorAll('.arc-embed[data-embed]').forEach(function (box) {   // embedded player: loaded only now
      if (box.firstChild) return;
      var f = document.createElement('iframe');
      f.src = box.getAttribute('data-embed'); f.title = box.getAttribute('data-title') || 'Video';
      f.allow = 'autoplay; fullscreen; picture-in-picture'; f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin';
      box.appendChild(f);
    });
    d.showModal();
  });
  d.addEventListener('click', function (ev) { if (ev.target === d) d.close(); });
  d.addEventListener('close', function () { d.querySelectorAll('video').forEach(function (v) { v.pause(); }); d.querySelectorAll('.arc-embed').forEach(function (b) { b.textContent = ''; }); });
});

/* "Last updated" in each tutorial's pop-up: freebies/updated.json may be newer than this page
   (an hourly sync publishes tutorials without rebuilding the site), so read it and refresh the times. */
(function () {
  var marks = document.querySelectorAll('time[data-updated]');
  if (!marks.length || !window.fetch || !window.Intl) return;
  fetch('/tutorials/updated.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (upd) {
    if (!upd) return;
    var fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
    marks.forEach(function (t) {
      var d = new Date(upd[t.getAttribute('data-updated')] || ''); if (isNaN(d)) return;
      t.setAttribute('datetime', d.toISOString()); t.textContent = 'Last updated ' + fmt.format(d).replace(/\.,/, '.,');
    });
  }).catch(function () {});
})();
