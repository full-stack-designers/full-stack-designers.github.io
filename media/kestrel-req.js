/* Kestrel requirements modal: one component for every page of Full Stack Designers that offers the requirements
   (the tutorials and the Learning Path). Two tabs: Video (the narrated requirements video) and Document (the full
   Kestrel Simulator Requirements, with a filter). It takes over the page's own requirements buttons:
     [data-rq]            a tutorial's Requirements button, or a rule chip such as FLT-32 (opens at that rule)
     #req-open, button.rq the same in the FastAPI and Postgres tutorials
     .fp-doc-btn          the Learning Path's "Read the Kestrel requirements"
   Added to the pages when the site is built, so it survives a tutorial being republished. */
(function () {
  'use strict';
  var BASE = '/media/', VIDEO = BASE + 'kestrel-requirements.mp4', POSTER = BASE + 'kestrel-requirements.jpg';
  var DOC = BASE + 'kestrel-requirements.html' + (document.currentScript && document.currentScript.dataset.v ? '?v=' + document.currentScript.dataset.v : '');
  var CAP = 'The requirements in under two minutes: the mission, the seven phases, the power budget, preflight, and who checks what.';
  var TRIGGERS = '[data-rq], #req-open, button.rq, .fp-doc-btn';

  var css = '' +
    '.kq{position:fixed;inset:0;z-index:2147483000;background:rgba(3,6,9,.78);display:flex;align-items:center;justify-content:center;padding:16px;' +
      '--kq-bg:#0a0e13;--kq-surface:#10161c;--kq-sunk:#172029;--kq-ink:#d6dfe6;--kq-muted:#8696a3;--kq-line:#222e38;--kq-accent:#c8e06a;--kq-accent-soft:#272f10;' +
      '--kq-mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--kq-body:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;' +
      'font:16px/1.6 var(--kq-body);color:var(--kq-ink);text-align:left}' +
    '.kq[hidden]{display:none}' +
    '.kq *{box-sizing:border-box}' +
    '.kq-box{background:var(--kq-surface);border:1px solid var(--kq-accent);border-radius:6px;width:min(920px,100%);max-height:min(88vh,100%);display:flex;flex-direction:column;overflow:hidden}' +
    '.kq-head{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--kq-line);flex:none}' +
    '.kq-head h2{font:700 1rem var(--kq-mono);margin:0;padding:0;border:0;flex:1 1 220px;color:var(--kq-ink);letter-spacing:0}' +
    '.kq-head h2::before{content:"## ";color:var(--kq-muted);font-weight:400}' +
    '.kq-head input{flex:1 1 180px;min-width:0;font:400 16px var(--kq-mono);padding:6px 10px;border:1px solid var(--kq-line);border-radius:4px;background:var(--kq-bg);color:var(--kq-ink)}' +
    '.kq-x{background:var(--kq-sunk);border:1px solid var(--kq-line);border-radius:4px;padding:4px 10px;font:400 .85rem var(--kq-mono);color:var(--kq-ink);cursor:pointer}' +
    '.kq-x:hover,.kq-x:focus-visible{border-color:var(--kq-accent);outline:none}' +
    '.kq-tabs{display:flex;gap:4px;padding:0 16px;border-bottom:1px solid var(--kq-line);flex:none}' +
    '.kq-tabs button{font:500 .85rem var(--kq-mono);background:none;border:0;border-bottom:2px solid transparent;color:var(--kq-muted);padding:9px 12px;margin-bottom:-1px;cursor:pointer}' +
    '.kq-tabs button[aria-selected="true"]{color:var(--kq-accent);border-bottom-color:var(--kq-accent)}' +
    '.kq-tabs button:focus-visible{outline:2px solid var(--kq-accent);outline-offset:-2px}' +
    '.kq-panel{overflow:auto;min-height:0;flex:1 1 auto}.kq-panel[hidden]{display:none}' +
    '.kq-vid{padding:16px}' +
    '.kq-vid video{display:block;width:100%;height:auto;aspect-ratio:16/9;border-radius:6px;background:#081d3a}' +
    '.kq-vid p{font-size:.85rem;color:var(--kq-muted);margin:10px 0 0}' +
    '.kq-doc{padding:4px 16px 20px}' +
    '.kq-sub{margin:0 -16px 8px;padding:8px 16px;font-size:.85rem;color:var(--kq-muted);border-bottom:1px solid var(--kq-line)}' +
    '.kq-doc h1{display:none}' +
    '.kq-doc h2{font:700 .95rem var(--kq-mono);color:var(--kq-accent);margin:22px 0 8px;padding:0;border:0}' +
    '.kq-doc h3{font:700 .88rem var(--kq-mono);color:var(--kq-ink);margin:16px 0 6px}' +
    '.kq-doc p,.kq-doc li{font-size:.9rem;color:var(--kq-muted);margin:0 0 8px}' +
    '.kq-doc ul,.kq-doc ol{padding-left:20px;margin:0 0 10px}' +
    '.kq-doc code{background:var(--kq-sunk);padding:1px 5px;border-radius:4px;color:#e3f0a8;font:.85em var(--kq-mono)}' +
    '.kq-doc a{color:var(--kq-accent)}' +
    '.kq-doc .doc-t{overflow-x:auto}' +
    '.kq-doc table{border-collapse:collapse;width:100%;font-size:.86rem;margin:0 0 12px}' +
    '.kq-doc th{text-align:left;font:500 .72rem var(--kq-mono);text-transform:uppercase;letter-spacing:.06em;color:var(--kq-muted);border-bottom:1px solid var(--kq-line);padding:4px 10px 4px 0;background:none}' +
    '.kq-doc td{border-bottom:1px solid var(--kq-line);padding:6px 10px 6px 0;vertical-align:top;color:var(--kq-ink);background:none}' +
    '.kq-doc td:first-child{font-family:var(--kq-mono);white-space:nowrap}' +
    '.kq-doc tr.kq-hit td{background:var(--kq-accent-soft);box-shadow:inset 0 1px 0 var(--kq-accent),inset 0 -1px 0 var(--kq-accent)}' +
    '.kq-doc [hidden]{display:none}' +
    '.kq-none{font-size:.9rem;color:var(--kq-muted)}' +
    '@media (prefers-reduced-motion:no-preference){.kq-box{animation:kq-in .16s ease-out}}@keyframes kq-in{from{transform:translateY(6px);opacity:0}}';

  var host, sh, root, box, tabs, pV, pD, video, filter, body, none, lastFocus = null, loaded = null;

  function build() {
    if (root) return;
    // a shadow root keeps every page's own styles out, so the modal looks and behaves the same on every page
    host = document.createElement('div'); host.id = 'kestrel-req';
    sh = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var st = document.createElement('style'); st.textContent = ':host{all:initial}' + css; sh.appendChild(st);
    root = document.createElement('div'); root.className = 'kq'; root.hidden = true;
    root.innerHTML =
      '<div class="kq-box" role="dialog" aria-modal="true" aria-labelledby="kq-title">' +
        '<div class="kq-head"><h2 id="kq-title">Kestrel requirements</h2>' +
          '<input type="search" class="kq-filter" placeholder="filter, e.g. FLT-32 or sprint" aria-label="Filter requirements">' +
          '<button type="button" class="kq-x">close</button></div>' +
        '<div class="kq-tabs" role="tablist" aria-label="Requirements">' +
          '<button type="button" role="tab" id="kq-tab-v" aria-controls="kq-panel-v">Video</button>' +
          '<button type="button" role="tab" id="kq-tab-d" aria-controls="kq-panel-d">Document</button></div>' +
        '<div class="kq-panel kq-vid" role="tabpanel" id="kq-panel-v" aria-labelledby="kq-tab-v">' +
          '<video controls preload="none" playsinline poster="' + POSTER + '" src="' + VIDEO + '" aria-label="Video: the Kestrel simulator requirements, narrated"></video>' +
          '<p>' + CAP + '</p></div>' +
        '<div class="kq-panel kq-doc" role="tabpanel" id="kq-panel-d" aria-labelledby="kq-tab-d" tabindex="0">' +
          '<p class="kq-sub">The Kestrel Simulator Requirements (17 November 2026): the one set of requirements every tutorial builds to. Every requirement has an ID, so code, tests and commits can point at it.</p>' +
          '<p class="kq-none" hidden>Nothing matches that text.</p><div class="kq-body"><p>Loading the document…</p></div></div>' +
      '</div>';
    sh.appendChild(root); document.body.appendChild(host);
    box = root.firstChild; tabs = root.querySelectorAll('[role=tab]'); pV = root.querySelector('#kq-panel-v'); pD = root.querySelector('#kq-panel-d');
    video = root.querySelector('video'); filter = root.querySelector('.kq-filter'); body = root.querySelector('.kq-body'); none = root.querySelector('.kq-none');
    tabs[0].addEventListener('click', function () { show(0); });
    tabs[1].addEventListener('click', function () { show(1); });
    Array.prototype.forEach.call(tabs, function (b, i) {
      b.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); show(1 - i); tabs[1 - i].focus(); } });
    });
    root.querySelector('.kq-x').addEventListener('click', close);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Tab') {                                   // keep focus inside the dialog
        var f = Array.prototype.filter.call(box.querySelectorAll('button,input,video,[tabindex="0"]'), function (x) { return x.offsetParent !== null; });
        if (!f.length) return; var a = f[0], z = f[f.length - 1];
        var act = sh.activeElement || document.activeElement;
        if (e.shiftKey && act === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && act === z) { e.preventDefault(); a.focus(); }
      }
    });
    filter.addEventListener('input', function () { show(1); applyFilter(); });
  }

  function load() {
    if (loaded) return loaded;
    loaded = fetch(DOC).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (h) {
      body.innerHTML = h;
      Array.prototype.forEach.call(body.querySelectorAll('tr'), function (tr) {
        var c = tr.querySelector('td'); var m = c && /^\s*([A-Z]{2,3}-\d{2,3})\s*$/.exec(c.textContent);
        if (m) tr.setAttribute('data-kq', m[1]);
      });
      applyFilter();
    }).catch(function () { body.innerHTML = '<p>The document could not be loaded. Check the connection and open it again.</p>'; loaded = null; });
    return loaded;
  }

  function show(i) {
    [pV, pD].forEach(function (p, j) { p.hidden = j !== i; tabs[j].setAttribute('aria-selected', String(j === i)); tabs[j].tabIndex = j === i ? 0 : -1; });
    if (i !== 0 && !video.paused) video.pause();
  }

  function applyFilter() {
    var q = filter.value.trim().toLowerCase(), any = false, head = null, seen = 0;
    Array.prototype.forEach.call(body.querySelectorAll('table'), function (tb) {
      var shown = 0;
      Array.prototype.forEach.call(tb.querySelectorAll('tbody tr'), function (tr) {
        var hit = !q || tr.textContent.toLowerCase().indexOf(q) >= 0; tr.hidden = !hit; if (hit) shown++;
      });
      var w = tb.closest('.doc-t') || tb; w.hidden = !!q && !shown; if (shown) any = true;
    });
    var kids = body.children;
    var closeHead = function () { if (head) head.hidden = !!q && !seen; };
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k.tagName === 'H2') { closeHead(); head = k; seen = 0; continue; }
      if (k.matches('.doc-t, table')) { if (!k.hidden) seen++; continue; }
      k.hidden = !!q;                                          // prose and sub-headings only show unfiltered
    }
    closeHead();
    none.hidden = !q || any;
  }

  function open(rule) {
    build(); lastFocus = document.activeElement;
    filter.value = ''; root.hidden = false; document.documentElement.style.overflow = 'hidden';
    show(rule ? 1 : 0);
    load().then(function () {
      applyFilter();
      Array.prototype.forEach.call(body.querySelectorAll('tr.kq-hit'), function (r) { r.classList.remove('kq-hit'); });
      if (rule) {
        var row = body.querySelector('tr[data-kq="' + rule + '"]');
        if (row) { row.classList.add('kq-hit'); row.scrollIntoView({ block: 'center' }); } else pD.scrollTop = 0;
      } else pD.scrollTop = 0;
    });
    setTimeout(function () { (rule ? tabs[1] : tabs[0]).focus(); }, 0);
  }

  function close() {
    if (!root || root.hidden) return;
    root.hidden = true; document.documentElement.style.overflow = '';
    if (!video.paused) video.pause();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // take over the page's own requirements buttons, before the page's handlers see the click
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest(TRIGGERS);
    if (!b || (host && (e.target === host || host.contains(b)))) return;
    e.preventDefault(); e.stopImmediatePropagation();
    open(b.getAttribute('data-rq') || '');
  }, true);
})();
