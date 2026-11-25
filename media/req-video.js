/* Puts the Kestrel requirements video at the top of a tutorial's requirements modal.
   Added to the tutorial pages when the Full Stack Designers site is built, so it survives a tutorial being republished. */
(function () {
  var SRC = '/media/kestrel-requirements.mp4', POSTER = '/media/kestrel-requirements.jpg';
  var CAP = 'The requirements in under two minutes: the mission, the seven phases, the power budget, preflight, and who checks what.';
  function figure() {
    var f = document.createElement('figure'); f.className = 'kr-video';
    f.style.cssText = 'margin:0 0 14px;';
    var v = document.createElement('video');
    v.controls = true; v.preload = 'none'; v.playsInline = true; v.poster = POSTER; v.src = SRC;
    v.setAttribute('aria-label', 'Video: the Kestrel simulator requirements, narrated');
    v.style.cssText = 'display:block;width:100%;height:auto;aspect-ratio:16/9;border-radius:10px;background:#081d3a;';
    var c = document.createElement('figcaption'); c.textContent = CAP;
    c.style.cssText = 'font-size:13px;opacity:.75;margin-top:6px;line-height:1.4;';
    f.appendChild(v); f.appendChild(c); return f;
  }
  function place(box, after) {
    if (!box || box.querySelector('.kr-video')) return;
    var f = figure();
    if (after && after.parentNode === box) box.insertBefore(f, after.nextSibling); else box.insertBefore(f, box.firstChild);
  }
  function pauseIn(box) { var v = box && box.querySelector('.kr-video video'); if (v && !v.paused) v.pause(); }
  // style 1: <div id="rq-modal"><div class="modal-box"><div class="modal-head">…
  var rq = document.getElementById('rq-modal');
  if (rq) {
    var box = rq.querySelector('.modal-box') || rq;
    place(box, box.querySelector('.modal-head'));
    new MutationObserver(function () { if (rq.hidden) pauseIn(rq); }).observe(rq, { attributes: true, attributeFilter: ['hidden'] });
  }
  // style 2: <dialog id="req">, filled by the page's script when it opens
  var d = document.getElementById('req');
  if (d && d.tagName === 'DIALOG') {
    var fill = function () { if (d.firstElementChild) place(d, d.querySelector('.req-h')); };
    fill(); new MutationObserver(fill).observe(d, { childList: true });
    d.addEventListener('close', function () { pauseIn(d); });
  }
})();
