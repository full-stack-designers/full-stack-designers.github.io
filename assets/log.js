// Progress log: show each entry's OpenTimestamps status, read from the proofs the stamping job publishes.
(function () {
  var fmt = function (iso) { try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return iso; } };
  document.querySelectorAll('[data-sha]').forEach(function (el) {
    var sha = el.getAttribute('data-sha'), base = '/learning-log/proofs/' + sha, st = el.querySelector('.lg-status');
    fetch(base + '.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
      if (m) {
        el.classList.add('ok');
        st.textContent = 'Anchored in Bitcoin block ' + m.bitcoin_block.toLocaleString() + ', ' + fmt(m.time);
        el.querySelector('.lg-proof').hidden = false; return;
      }
      return fetch(base + '.ots', { method: 'HEAD', cache: 'no-store' }).then(function (r) {
        if (r.ok) { st.textContent = 'Stamped. Waiting for Bitcoin to confirm it (usually a few hours).'; el.querySelector('.lg-proof').hidden = false; }
        else st.textContent = 'Being stamped. The proof appears here within a few minutes.';
      });
    }).catch(function () { st.textContent = 'Proof status unavailable right now.'; });
  });
})();
// "Verify in my browser": re-check one entry end to end, with no files to download or upload.
(function () {
  if (!window.OTS) return;
  var EXPLORERS = ['https://blockstream.info/api', 'https://mempool.space/api'];
  function get(path, as) {
    var i = 0;
    function next() {
      var base = EXPLORERS[i++];
      if (!base) return Promise.reject(new Error('no block explorer answered'));
      return fetch(base + path).then(function (r) { if (!r.ok) throw new Error(r.status); return as === 'json' ? r.json() : r.text(); })
        .then(function (v) { return { v: v, base: base }; }, next);
    }
    return next();
  }
  function bytes(url) { return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.arrayBuffer(); }).then(function (b) { return new Uint8Array(b); }); }
  function li(ol, ok, html) { var x = document.createElement('li'); x.className = ok === true ? 'ok' : ok === false ? 'bad' : 'wait'; x.innerHTML = html; ol.appendChild(x); return x; }
  function host(u) { try { return new URL(u).host; } catch (e) { return u; } }
  document.querySelectorAll('.lg-verify').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var box = btn.closest('[data-sha]'), sha = box.getAttribute('data-sha'), entry = btn.getAttribute('data-entry');
      var ol = box.querySelector('.lg-steps'); ol.innerHTML = ''; ol.hidden = false; btn.disabled = true; btn.textContent = 'Checking…';
      Promise.all([bytes(entry), bytes('/learning-log/proofs/' + sha + '.ots')]).then(function (r) {
        var h = OTS.hex(OTS.sha256(r[0])), p = OTS.readProof(r[1]);
        li(ol, h === sha, 'Your browser hashed this entry: SHA-256 <code>' + h + '</code>' + (h === sha ? ', which matches the fingerprint shown.' : ', which does <strong>not</strong> match the fingerprint shown.'));
        var same = OTS.hex(p.digest) === h;
        li(ol, same, same ? 'The proof file was made for exactly this entry.' : 'The proof file was made for a different file.');
        if (!same) return;
        var btc = p.attestations.filter(function (a) { return a.type === 'bitcoin'; }), pend = p.attestations.filter(function (a) { return a.type === 'pending'; });
        if (!btc.length) {
          li(ol, null, 'Not in Bitcoin yet. ' + pend.length + ' timestamp servers hold it (' + pend.map(function (a) { return host(a.uri); }).join(', ') + ') and add it to the next Bitcoin transaction. That usually takes a few hours; after that, this check confirms the block.');
          return;
        }
        return Promise.all(btc.map(function (a) {
          var expect = OTS.hex(a.msg.slice().reverse()), row = li(ol, null, 'Checking Bitcoin block ' + a.height.toLocaleString() + '…');
          return get('/block-height/' + a.height).then(function (r) { return get('/block/' + r.v.trim(), 'json'); }).then(function (r) {
            var ok = r.v.merkle_root === expect, when = new Date(r.v.timestamp * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
            row.className = ok ? 'ok' : 'bad';
            row.innerHTML = ok ? 'Bitcoin block <a href="https://blockstream.info/block/' + r.v.id + '" rel="noopener">' + a.height.toLocaleString() + '</a>, mined ' + when + ', contains this entry\'s fingerprint. Checked against ' + host(r.base) + ', a public block explorer. So this entry existed, word for word, by then.'
                               : 'Bitcoin block ' + a.height.toLocaleString() + ' does <strong>not</strong> match this proof.';
          }, function () { row.innerHTML = 'Could not reach a block explorer to check block ' + a.height.toLocaleString() + '. Try again later.'; });
        }));
      }).catch(function (e) { li(ol, false, 'Could not run the check: ' + (e.message || e)); })
        .then(function () { btn.disabled = false; btn.textContent = 'Verify again'; });
    });
  });
})();
