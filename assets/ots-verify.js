// Verify an OpenTimestamps proof in the browser, with no files to download or upload.
// 1. Hash the entry file (SHA-256) and check the proof was made for exactly that file.
// 2. Replay the proof's operations to get the value each notary attests.
// 3. For a Bitcoin attestation, fetch that block's header from a public explorer
//    (blockstream.info) and check the value equals the block's merkle root.
// Format: https://github.com/opentimestamps/python-opentimestamps (core/serialize.py, op.py, timestamp.py, notary.py)
(function () {
  'use strict';
  // ---------- hashes: SHA-256, RIPEMD-160 (the two the Bitcoin calendars use), SHA-1 ----------
  function rotl(x, n) { return (x << n) | (x >>> (32 - n)); }
  function sha256(m) {
    var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var l = m.length, n = ((l + 9 + 63) >> 6) << 6, b = new Uint8Array(n); b.set(m); b[l] = 0x80;
    var bits = l * 8; for (var i = 0; i < 8; i++) b[n - 1 - i] = Math.floor(bits / Math.pow(2, 8 * i)) & 255;
    var w = new Int32Array(64);
    for (var o = 0; o < n; o += 64) {
      for (i = 0; i < 16; i++) w[i] = (b[o+4*i] << 24) | (b[o+4*i+1] << 16) | (b[o+4*i+2] << 8) | b[o+4*i+3];
      for (i = 16; i < 64; i++) {
        var s0 = rotl(w[i-15], 25) ^ rotl(w[i-15], 14) ^ (w[i-15] >>> 3), s1 = rotl(w[i-2], 15) ^ rotl(w[i-2], 13) ^ (w[i-2] >>> 10);
        w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
      }
      var a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var t1 = (h + (rotl(e, 26) ^ rotl(e, 21) ^ rotl(e, 7)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        var t2 = ((rotl(a, 30) ^ rotl(a, 19) ^ rotl(a, 10)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = new Uint8Array(32); for (i = 0; i < 8; i++) { out[4*i] = H[i] >>> 24; out[4*i+1] = H[i] >>> 16; out[4*i+2] = H[i] >>> 8; out[4*i+3] = H[i]; }
    return out;
  }
  function md_pad_le(m) { // little-endian length padding (RIPEMD-160)
    var l = m.length, n = ((l + 9 + 63) >> 6) << 6, b = new Uint8Array(n); b.set(m); b[l] = 0x80;
    var bits = l * 8; for (var i = 0; i < 8; i++) b[n - 8 + i] = Math.floor(bits / Math.pow(2, 8 * i)) & 255;
    return b;
  }
  function ripemd160(m) {
    var b = md_pad_le(m), h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
    var zl = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,7,4,13,1,10,6,15,3,12,0,9,5,2,14,11,8,3,10,14,4,9,15,8,1,2,7,0,6,13,11,5,12,1,9,11,10,0,8,12,4,13,3,7,15,14,5,6,2,4,0,5,9,7,12,2,10,14,1,3,8,11,6,15,13];
    var zr = [5,14,7,0,9,2,11,4,13,6,15,8,1,10,3,12,6,11,3,7,0,13,5,10,14,15,8,12,4,9,1,2,15,5,1,3,7,14,6,9,11,8,12,2,10,0,4,13,8,6,4,1,3,11,15,0,5,12,2,13,9,7,10,14,12,15,10,4,1,5,8,7,6,2,13,14,0,3,9,11];
    var sl = [11,14,15,12,5,8,7,9,11,13,14,15,6,7,9,8,7,6,8,13,11,9,7,15,7,12,15,9,11,7,13,12,11,13,6,7,14,9,13,15,14,8,13,6,5,12,7,5,11,12,14,15,14,15,9,8,9,14,5,6,8,6,5,12,9,15,5,11,6,8,13,12,5,12,13,14,11,8,5,6];
    var sr = [8,9,9,11,13,15,15,5,7,7,8,11,14,14,12,6,9,13,15,7,12,8,9,11,7,7,12,7,6,15,13,11,9,7,15,11,8,6,6,14,12,13,5,14,13,13,7,5,15,5,8,11,14,14,6,14,6,9,12,9,12,5,15,8,8,5,12,9,12,5,14,6,8,13,6,5,15,13,11,11];
    var kl = [0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e], kr = [0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000];
    function f(j, x, y, z) { return j < 16 ? x ^ y ^ z : j < 32 ? (x & y) | (~x & z) : j < 48 ? (x | ~y) ^ z : j < 64 ? (x & z) | (y & ~z) : x ^ (y | ~z); }
    var X = new Int32Array(16);
    for (var o = 0; o < b.length; o += 64) {
      for (var i = 0; i < 16; i++) X[i] = b[o+4*i] | (b[o+4*i+1] << 8) | (b[o+4*i+2] << 16) | (b[o+4*i+3] << 24);
      var al = h0, bl = h1, cl = h2, dl = h3, el = h4, ar = h0, br = h1, cr = h2, dr = h3, er = h4, t;
      for (var j = 0; j < 80; j++) {
        t = (rotl((al + f(j, bl, cl, dl) + X[zl[j]] + kl[j >> 4]) | 0, sl[j]) + el) | 0;
        al = el; el = dl; dl = rotl(cl, 10); cl = bl; bl = t;
        t = (rotl((ar + f(79 - j, br, cr, dr) + X[zr[j]] + kr[j >> 4]) | 0, sr[j]) + er) | 0;
        ar = er; er = dr; dr = rotl(cr, 10); cr = br; br = t;
      }
      t = (h1 + cl + dr) | 0; h1 = (h2 + dl + er) | 0; h2 = (h3 + el + ar) | 0; h3 = (h4 + al + br) | 0; h4 = (h0 + bl + cr) | 0; h0 = t;
    }
    var out = new Uint8Array(20), H = [h0, h1, h2, h3, h4];
    for (i = 0; i < 5; i++) { out[4*i] = H[i]; out[4*i+1] = H[i] >>> 8; out[4*i+2] = H[i] >>> 16; out[4*i+3] = H[i] >>> 24; }
    return out;
  }
  function sha1(m) {
    var l = m.length, n = ((l + 9 + 63) >> 6) << 6, b = new Uint8Array(n); b.set(m); b[l] = 0x80;
    var bits = l * 8; for (var i = 0; i < 8; i++) b[n - 1 - i] = Math.floor(bits / Math.pow(2, 8 * i)) & 255;
    var H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0], w = new Int32Array(80);
    for (var o = 0; o < n; o += 64) {
      for (i = 0; i < 16; i++) w[i] = (b[o+4*i] << 24) | (b[o+4*i+1] << 16) | (b[o+4*i+2] << 8) | b[o+4*i+3];
      for (i = 16; i < 80; i++) w[i] = rotl(w[i-3] ^ w[i-8] ^ w[i-14] ^ w[i-16], 1);
      var a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4];
      for (i = 0; i < 80; i++) {
        var fk = i < 20 ? [(bb & c) | (~bb & d), 0x5a827999] : i < 40 ? [bb ^ c ^ d, 0x6ed9eba1] : i < 60 ? [(bb & c) | (bb & d) | (c & d), 0x8f1bbcdc] : [bb ^ c ^ d, 0xca62c1d6];
        var t = (rotl(a, 5) + fk[0] + e + fk[1] + w[i]) | 0; e = d; d = c; c = rotl(bb, 30); bb = a; a = t;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0;
    }
    var out = new Uint8Array(20); for (i = 0; i < 5; i++) { out[4*i] = H[i] >>> 24; out[4*i+1] = H[i] >>> 16; out[4*i+2] = H[i] >>> 8; out[4*i+3] = H[i]; }
    return out;
  }
  // ---------- proof parser ----------
  var HEADER = [0x00,0x4f,0x70,0x65,0x6e,0x54,0x69,0x6d,0x65,0x73,0x74,0x61,0x6d,0x70,0x73,0x00,0x00,0x50,0x72,0x6f,0x6f,0x66,0x00,0xbf,0x89,0xe2,0xe8,0x84,0xe8,0x92,0x94];
  var BITCOIN = '0588960d73d71901', PENDING = '83dfe30d2ef90c8e';
  function hex(u) { var s = ''; for (var i = 0; i < u.length; i++) s += (u[i] < 16 ? '0' : '') + u[i].toString(16); return s; }
  function cat(a, b) { var r = new Uint8Array(a.length + b.length); r.set(a); r.set(b, a.length); return r; }
  function Reader(buf) { this.b = buf; this.p = 0; }
  Reader.prototype.byte = function () { if (this.p >= this.b.length) throw new Error('proof ends early'); return this.b[this.p++]; };
  Reader.prototype.bytes = function (n) { if (this.p + n > this.b.length) throw new Error('proof ends early'); var r = this.b.slice(this.p, this.p + n); this.p += n; return r; };
  Reader.prototype.varuint = function () { var v = 0, s = 0, c; do { c = this.byte(); v += (c & 127) * Math.pow(2, s); s += 7; } while (c & 128); return v; };
  Reader.prototype.varbytes = function () { return this.bytes(this.varuint()); };
  function parseTimestamp(r, msg, out, depth) {
    if (depth > 512) throw new Error('proof too deep');
    function one(tag) {
      if (tag === 0x00) {
        var t = hex(r.bytes(8)), payload = new Reader(r.varbytes());
        if (t === BITCOIN) out.push({ type: 'bitcoin', height: payload.varuint(), msg: msg });
        else if (t === PENDING) out.push({ type: 'pending', uri: new TextDecoder().decode(payload.varbytes()), msg: msg });
        else out.push({ type: 'unknown', tag: t, msg: msg });
        return;
      }
      var next;
      if (tag === 0xf0) next = cat(msg, r.varbytes());
      else if (tag === 0xf1) next = cat(r.varbytes(), msg);
      else if (tag === 0x08) next = sha256(msg);
      else if (tag === 0x03) next = ripemd160(msg);
      else if (tag === 0x02) next = sha1(msg);
      else if (tag === 0xf2) next = msg.slice().reverse();
      else if (tag === 0xf3) next = new TextEncoder().encode(hex(msg));
      else throw new Error('unsupported operation 0x' + tag.toString(16));
      parseTimestamp(r, next, out, depth + 1);
    }
    var tag = r.byte();
    while (tag === 0xff) { one(r.byte()); tag = r.byte(); }
    one(tag);
  }
  function readProof(ots) {
    var r = new Reader(ots);
    var h = r.bytes(HEADER.length); for (var i = 0; i < HEADER.length; i++) if (h[i] !== HEADER[i]) throw new Error('not an OpenTimestamps proof');
    if (r.varuint() !== 1) throw new Error('unknown proof version');
    if (r.byte() !== 0x08) throw new Error('proof is not for a SHA-256 file hash');
    var digest = r.bytes(32), atts = [];
    parseTimestamp(r, digest, atts, 0);
    return { digest: digest, attestations: atts };
  }
  window.OTS = { sha256: sha256, ripemd160: ripemd160, sha1: sha1, hex: hex, readProof: readProof };
})();
