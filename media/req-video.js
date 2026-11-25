/* Gives a tutorial's requirements modal two tabs: Video (the Kestrel requirements video) and Document (the
   requirements the page already shows). Added to the tutorial pages when the Full Stack Designers site is built,
   so it survives a tutorial being republished.
   The modal opens on Video, except when a lesson opens it at a specific rule (or the filter is used): then Document. */
(function () {
  var SRC = '/media/kestrel-requirements.mp4', POSTER = '/media/kestrel-requirements.jpg';
  var CAP = 'The requirements in under two minutes: the mission, the seven phases, the power budget, preflight, and who checks what.';
  var css = document.createElement('style');
  css.textContent =
    '.kr-tabs{display:flex;gap:4px;margin:2px 0 12px;border-bottom:1px solid rgba(127,127,127,.35)}' +
    '.kr-tabs button{font:inherit;font-size:14px;background:none;border:0;border-bottom:2px solid transparent;color:inherit;opacity:.7;padding:8px 14px;margin-bottom:-1px;cursor:pointer}' +
    '.kr-tabs button[aria-selected="true"]{opacity:1;border-bottom-color:currentColor;font-weight:600}' +
    '.kr-tabs button:focus-visible{outline:2px solid currentColor;outline-offset:2px}' +
    '.kr-video video{display:block;width:100%;height:auto;aspect-ratio:16/9;border-radius:10px;background:#081d3a}' +
    '.kr-video figcaption{font-size:13px;opacity:.75;margin-top:8px;line-height:1.4}' +
    '.kr-video{margin:0 0 6px}';
  document.head.appendChild(css);
  var uid = 0;

  function setup(box, head) {
    if (!box || box.querySelector('.kr-tabs')) return null;
    var n = ++uid, rest = [], el = head ? head.nextSibling : box.firstChild;
    while (el) { rest.push(el); el = el.nextSibling; }
    var tabs = document.createElement('div'); tabs.className = 'kr-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Requirements');
    var pV = document.createElement('div'), pD = document.createElement('div'); pD.className = 'kr-doc';
    [['Video', pV], ['Document', pD]].forEach(function (x, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = x[0];
      b.id = 'kr-tab-' + n + '-' + i; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'kr-panel-' + n + '-' + i);
      x[1].id = 'kr-panel-' + n + '-' + i; x[1].setAttribute('role', 'tabpanel'); x[1].setAttribute('aria-labelledby', b.id);
      b.addEventListener('click', function () { show(i); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); show(1 - i); tabs.children[1 - i].focus(); }
      });
      tabs.appendChild(b);
    });
    var f = document.createElement('figure'); f.className = 'kr-video';
    var v = document.createElement('video'); v.controls = true; v.preload = 'none'; v.playsInline = true; v.poster = POSTER; v.src = SRC;
    v.setAttribute('aria-label', 'Video: the Kestrel simulator requirements, narrated');
    var c = document.createElement('figcaption'); c.textContent = CAP;
    f.appendChild(v); f.appendChild(c); pV.appendChild(f);
    rest.forEach(function (x) { pD.appendChild(x); });
    var at = head ? head.nextSibling : box.firstChild;
    box.insertBefore(tabs, at); box.insertBefore(pV, at); box.insertBefore(pD, at);
    function show(i) {
      [pV, pD].forEach(function (p, j) { p.hidden = j !== i; tabs.children[j].setAttribute('aria-selected', String(j === i)); tabs.children[j].tabIndex = j === i ? 0 : -1; });
      if (i !== 0 && !v.paused) v.pause();
    }
    show(0);
    return { show: show, video: v };
  }

  // style 1: <div id="rq-modal"><div class="modal-box"><div class="modal-head">… opened by .rq-open buttons (data-rq names a rule)
  var rq = document.getElementById('rq-modal');
  if (rq) {
    var box = rq.querySelector('.modal-box') || rq, t1 = setup(box, box.querySelector('.modal-head'));
    if (t1) {
      document.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-rq]');
        if (b) t1.show(b.getAttribute('data-rq') ? 1 : 0);
      }, true);
      var fl = document.getElementById('rq-filter'); if (fl) fl.addEventListener('input', function () { t1.show(1); });
      new MutationObserver(function () { if (rq.hidden && !t1.video.paused) t1.video.pause(); }).observe(rq, { attributes: true, attributeFilter: ['hidden'] });
    }
  }
  // style 2: <dialog id="req">, filled by the page's own script when it opens
  var d = document.getElementById('req');
  if (d && d.tagName === 'DIALOG') {
    var t2 = null, queued = false, fill = function () {
      if (queued) return; queued = true;
      requestAnimationFrame(function () {                 // let the page finish filling the dialog first
        queued = false; if (!d.firstElementChild) return;
        if (!d.querySelector('.kr-tabs')) { t2 = setup(d, d.querySelector('.req-h')); return; }
        var doc = d.querySelector('.kr-doc'), x = doc && doc.nextSibling;   // anything added later belongs to the document
        while (x) { var nx = x.nextSibling; doc.appendChild(x); x = nx; }
      });
    };
    fill(); new MutationObserver(fill).observe(d, { childList: true });
    d.addEventListener('close', function () { if (t2 && !t2.video.paused) t2.video.pause(); });
  }
})();
