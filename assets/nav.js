/* On narrow screens the menu scrolls sideways: start it scrolled so the current page is in view. */
(function () {
  var nav = document.querySelector('.top .nav'), cur = nav && nav.querySelector('[aria-current]');
  if (!nav || !cur || nav.scrollWidth <= nav.clientWidth) return;
  var n = nav.getBoundingClientRect(), c = cur.getBoundingClientRect();
  var left = c.left - n.left + nav.scrollLeft;                 // position of the item inside the scroller
  nav.scrollLeft = Math.max(0, left - (nav.clientWidth - c.width) / 2);
})();

/* Home, small screens: the Learning Path panel starts collapsed and opens on tap. */
(function () {
  document.documentElement.classList.add('js');
  var box = document.getElementById('gn-fold'), btn = box && box.querySelector('.gn-toggle');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var open = box.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
})();

/* work-config.json (repo root) sets the card thumbnails and the case study order.
   The build already applies it; this applies a newer copy committed since the last build. */
(function () {
  var thumbs = document.querySelectorAll('.gthumbs[data-group]'), lists = document.querySelectorAll('[data-order-group]'),
      next = document.querySelector('.next[data-group]');
  if (!window.fetch || (!thumbs.length && !lists.length && !next)) return;
  function names(a) { return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string'; }) : []; }
  function ordered(all, want) {                       // want first (known names only), then the rest as built
    var out = []; want.forEach(function (n) { if (all.indexOf(n) > -1 && out.indexOf(n) < 0) out.push(n); });
    all.forEach(function (n) { if (out.indexOf(n) < 0) out.push(n); }); return out;
  }
  fetch(document.documentElement.getAttribute('data-config') || '/work-config.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (cfg) {
    var S = cfg && cfg.sections; if (!S) return;
    thumbs.forEach(function (box) {
      var c = S[box.dataset.group]; if (!c) return;
      var el = {}; box.querySelectorAll('.gt[data-slug]').forEach(function (g) { el[g.dataset.slug] = g; });
      var show = []; names([c.hero].concat(c.thumbnails || [])).forEach(function (n) { if (el[n] && show.indexOf(n) < 0) show.push(n); });
      if (!show.length) return;
      Object.keys(el).forEach(function (n) { el[n].hidden = show.indexOf(n) < 0; });
      show.slice().reverse().forEach(function (n) { box.insertBefore(el[n], box.firstChild); });
    });
    lists.forEach(function (box) {
      var c = S[box.dataset.orderGroup]; if (!c) return;
      var items = [].slice.call(box.children).filter(function (x) { return x.dataset && x.dataset.slug; }); if (!items.length) return;
      var el = {}; items.forEach(function (x) { el[x.dataset.slug] = x; });
      var after = items[items.length - 1].nextSibling;
      ordered(items.map(function (x) { return x.dataset.slug; }), names(c.order)).forEach(function (n, i) {
        box.insertBefore(el[n], after);
        var num = el[n].querySelector('.num'); if (num) num.textContent = num.textContent.replace(/^\d+/, ('0' + (i + 1)).slice(-2));
      });
    });
    if (next) {
      var g = next.dataset.group, c = S[g]; if (!c) return;
      return fetch('/assets/work-index.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (ix) {
        var t = ix && ix[g]; if (!t) return;
        var o = ordered(Object.keys(t), names(c.order)), i = o.indexOf(next.dataset.slug); if (i < 0) return;
        var n = o[(i + 1) % o.length], a = next.querySelector('a'), s = a && a.querySelector('strong');
        if (a && s) { a.setAttribute('href', '/work/' + n + '/'); s.textContent = t[n] + ' →'; }
      });
    }
  }).catch(function () {});
})();

/* Reading aid: highlight the text one sentence at a time, driven by scroll.
   Home page intro and every case study. Settings come from "reading_aid" in /work-config.json.
   Short text (fits in about a screen): the highlight moves on after scroll_per_line px for each line the sentence takes up.
   Long text: the highlighted sentence is the one at reading_point down the screen. */
(function () {
  var SEL = '.hero .lede, article .body > .lede, article .body > p, article .body > ul.points > li, article .body > ol > li, article .body > .proof > p';
  // About page and Learning Path page.
  SEL += ', .page-head > .wrap > p, .about .bio > p:not([style]), .quotes .q > p, .about .tl li div > span, .about .skills dd, .fb-log-text > strong, .fp-intro, .fp-note';
  // Home page: every block of body text, not only the intro.
  if (document.querySelector('.hero')) SEL += ', .hero .stance > p, #gn-fold .gn-main > p:not([class]), #gn-fold .gn-log > p:not([class]), .approach-intro, .approach .decisions > li > p, .groups .group > p:not(.mono), footer.foot p.fine:first-of-type';
  var ROWS = '#gn-fold, .approach .decisions, .groups, .quotes, .about, .fp-stages';   // blocks that can sit side by side
  var targets = document.querySelectorAll(SEL);
  if (!targets.length) return;
  var cfg = { enabled: true, scroll_per_line: 10, reading_point: 0.45, catch_up_ms: 60, hover: true, hover_delay_ms: 1000 };
  var pinned = false, scrolled = false;   // pinned: a sentence chosen by hovering, kept until the next scroll
  var words = [], units = [], live = [], at = -1, queued = false, ready = false;
  var END = /[.!?]["'”’)\]]*\s*$/, NUM = /^\(?\d+[.)]\s*$/, ABBR = /^(e\.g|i\.e|vs|etc|mr|mrs|ms|dr|st|no|fig|approx)\.\s*$/i, OPEN = /^["'“‘(\[]*[A-Z0-9]/;

  function wrap(el) {                                   // wrap each word, keeping links and bold intact, then group the words into sentences
    var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [], n, mine = [];
    while ((n = tw.nextNode())) nodes.push(n);
    nodes.forEach(function (t) {
      var parts = t.nodeValue.match(/\s*\S+\s*/g);
      if (!parts) return;
      var f = document.createDocumentFragment();
      parts.forEach(function (w) {
        var s = document.createElement('span');
        s.className = 'hl-w'; s.textContent = w; f.appendChild(s); words.push(s); mine.push(s);
      });
      t.parentNode.replaceChild(f, t);
    });
    var cur = [], first = units.length;
    mine.forEach(function (s, k) {
      cur.push(s);
      var w = s.textContent, next = mine[k + 1];
      if (!next) return;
      if (END.test(w) && !NUM.test(w) && !ABBR.test(w) && OPEN.test(next.textContent)) { units.push({ w: cur }); cur = []; }
    });
    if (cur.length) units.push({ w: cur });
    for (var q = first; q < units.length; q++) units[q].w.forEach(function (s) { s._u = units[q]; });
    units.forEach(function (u) {                         // keep the space after a sentence out of the highlight
      var s = u.w[u.w.length - 1], m = s && !s.dataset.t && s.textContent.match(/\s+$/);
      if (!m) return;
      s.dataset.t = '1'; s.textContent = s.textContent.slice(0, -m[0].length);
      s.parentNode.insertBefore(document.createTextNode(m[0]), s.nextSibling);
    });
  }
  function measure() {
    live = [];
    units.forEach(function (u) {
      var top = Infinity, bottom = -Infinity, tops = [];
      u.w.forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (!r.height) return;
        var t = r.top + window.scrollY;
        if (t < top) top = t;
        if (t + r.height > bottom) bottom = t + r.height;
        if (!tops.some(function (x) { return Math.abs(x - t) <= 4; })) tops.push(t);
      });
      if (top === Infinity) return;
      u.top = top; u.bottom = bottom; u.lines = tops.length; u.a = top; u.b = bottom;
      live.push(u);
    });
    // Text in side-by-side columns shares the same height on the page, so scroll position alone cannot order it.
    // Give each sentence in such a row its own slice of the row's height, in reading order.
    Array.prototype.slice.call(document.querySelectorAll(ROWS)).reverse().forEach(function (box) {   // inner rows first, the row that contains them last
      var us = live.filter(function (u) { return box.contains(u.w[0]); });
      if (us.length < 2) return;
      var side = false, T = Infinity, B = -Infinity, total = 0;
      us.forEach(function (u, k) {
        if (k && u.top < us[k - 1].top - 4) side = true;
        T = Math.min(T, u.top); B = Math.max(B, u.bottom); total += u.lines;
      });
      if (!side) return;
      var at = T;
      us.forEach(function (u) { u.a = at; at += (B - T) * u.lines / total; u.b = at; });
    });
  }
  function pick() {
    var vh = window.innerHeight, n = live.length, y = window.scrollY, i;
    if (live[n - 1].b - live[0].a <= vh * 1.2) {  // short text
      var total = 0;
      for (i = 0; i < n - 1; i++) total += live[i].lines;
      var s0 = Math.max(0, live[0].a - vh * 0.6);
      var need = total ? (live[n - 1].b - s0 - vh * 0.85) / total : 0;
      var step = Math.max(cfg.scroll_per_line, need, 1), edge = s0;
      for (i = 0; i < n - 1; i++) { edge += live[i].lines * step; if (y < edge) return i; }
      return n - 1;
    }
    var max = Math.max(1, document.documentElement.scrollHeight - vh);
    var rp = cfg.reading_point;                          // near the page end the point slides down so the last sentences are reachable
    var tail = Math.max(0, live[n - 1].b - (max + vh * rp));
    var ref = y + vh * rp + (tail ? tail * Math.max(0, (y - (max - vh)) / vh) : 0);
    var best = 0, d = Infinity;
    for (i = 0; i < n; i++) {
      var k = ref < live[i].a ? live[i].a - ref : (ref > live[i].b ? ref - live[i].b : 0);
      if (k < d) { d = k; best = i; if (!k) break; }
    }
    return best;
  }
  function show(i) {
    if (live[at]) live[at].w.forEach(function (s) { s.classList.remove('on'); });
    live[i].w.forEach(function (s) { s.classList.add('on'); });
    at = i;
  }
  // The highlight walks to the target one sentence at a time, so a fast scroll never skips one.
  // The further behind it is, the faster it walks.
  var want = -1, walking = false, last = 0;
  function walk(now) {
    if (!ready || at === want || want < 0) { walking = false; return; }
    var dist = Math.abs(want - at);
    if (dist > 30) { show(want > at ? want - 30 : want + 30); dist = 30; }   // a jump link: skip ahead, then walk the last stretch
    var wait = Math.max(14, Math.min(cfg.catch_up_ms, cfg.catch_up_ms * 4 / dist));
    if (at < 0 || dist === 1 || now - last >= wait) { show(at < 0 ? want : at + (want > at ? 1 : -1)); last = now; }
    if (at === want) { walking = false; return; }
    requestAnimationFrame(walk);
  }
  function update() {
    queued = false;
    if (!ready || !live.length) return;
    if (pinned) {
      if (!scrolled) return;                            // a resize or an image loading does not move a hovered sentence
      pinned = false; scrolled = false; walking = false;
      want = pick(); if (want !== at) show(want);       // after a hover, the scroll takes over at once, without walking
      return;
    }
    scrolled = false;
    want = pick();
    if (want !== at && !walking) { walking = true; requestAnimationFrame(walk); }
  }
  function onScroll() { scrolled = true; if (!queued) { queued = true; requestAnimationFrame(update); } }
  function reset() {                                    // re-measure (resize, images loading) but keep the place
    var keep = live[at];
    words.forEach(function (s) { s.classList.remove('on'); }); at = -1; want = -1; measure();
    var k = keep ? live.indexOf(keep) : -1;
    if (k >= 0) show(k);
    update();
  }
  function start() {
    if (!cfg.enabled) return;
    targets.forEach(wrap);
    document.documentElement.classList.add('reading-aid');
    ready = true;
    var rz = null, again = function () { clearTimeout(rz); rz = setTimeout(reset, 200); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', again);
    if (window.ResizeObserver) new ResizeObserver(again).observe(document.body);   // images loading move the text
    // Hover: rest the pointer on a sentence for hover_delay_ms and it becomes the highlighted one.
    if (cfg.hover && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var ht = null, hu = null;
      document.addEventListener('mouseover', function (ev) {
        var w = ev.target.closest && ev.target.closest('.hl-w'), u = w ? w._u : null;
        if (u === hu) return;
        hu = u; clearTimeout(ht);
        if (!u) return;
        ht = setTimeout(function () {
          var k = live.indexOf(u);
          if (k < 0) return;
          walking = false; want = k; scrolled = false; pinned = true;
          if (k !== at) show(k);
        }, cfg.hover_delay_ms);
      });
      document.addEventListener('mouseleave', function () { hu = null; clearTimeout(ht); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reset); else reset();
  }
  function num(v, d, lo, hi) { return typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; }
  if (!window.fetch) { start(); return; }
  fetch(document.documentElement.getAttribute('data-config') || '/work-config.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (c) {
    var a = c && c.reading_aid;
    if (a && typeof a === 'object') {
      cfg.enabled = a.enabled !== false;
      cfg.scroll_per_line = num(a.scroll_per_line, 10, 1, 200);
      cfg.reading_point = num(a.reading_point, 0.45, 0.1, 0.9);
      cfg.catch_up_ms = num(a.catch_up_ms, 60, 14, 10000);
      cfg.hover = a.hover !== false;
      cfg.hover_delay_ms = num(a.hover_delay_ms, 1000, 0, 10000);
    }
  }).catch(function () {}).then(start);
})();

/* Copy button on prompt blocks. */
document.addEventListener('click', function (ev) {
  var b = ev.target.closest && ev.target.closest('.prompt-copy');
  if (!b) return;
  var pre = b.closest('.prompt').querySelector('pre'), txt = pre ? pre.textContent : '';
  var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1600); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () {});
  else { var r = document.createRange(); r.selectNodeContents(pre); var s = getSelection(); s.removeAllRanges(); s.addRange(r); try { document.execCommand('copy'); done(); } catch (x) {} }
});
