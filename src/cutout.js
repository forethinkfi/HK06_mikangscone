/* 내 사진으로 AI 비서 캐릭터 만들기 — 브라우저 안에서 배경을 지우고(누끼) 스티커처럼 다듬는다.
 * 서버로 사진을 보내지 않는다. 방법:
 *  1) 사진 가장자리 색들을 모아 "배경 색" 몇 가지를 정한다.
 *  2) 가장자리에서부터 배경 색과 비슷하고 이웃과도 비슷한 픽셀을 따라 채워 배경으로 표시한다.
 *  3) 가장 큰 덩어리(주인공)만 남기고, 경계를 부드럽게 한 뒤, 흰 테두리를 둘러 정사각형으로 맞춘다.
 * 배경이 단순할수록(벽, 하늘, 단색 천) 잘 된다. 복잡하면 '동그랗게 자르기'를 쓴다. */
(function (root) {
  'use strict';

  function loadImage(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('이미지를 열지 못했어요')); im.src = src; });
  }
  function fileToDataURL(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error || new Error('파일을 읽지 못했어요')); r.readAsDataURL(file); });
  }
  const dist2 = (r1, g1, b1, r2, g2, b2) => { const rm = (r1 + r2) / 2, dr = r1 - r2, dg = g1 - g2, db = b1 - b2; return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; };

  // 가장자리 색을 k개 대표색으로 묶는다 (간단한 k-평균)
  function borderPalette(d, w, h, k = 4) {
    const px = [];
    const push = (x, y) => { const i = (y * w + x) * 4; if (d[i + 3] > 10) px.push([d[i], d[i + 1], d[i + 2]]); };
    // 아래쪽 가장자리는 빼고 본다: 인물·반려동물 사진은 몸이 아래 끝에 닿아 있는 경우가 많다
    for (let x = 0; x < w; x += 2) { push(x, 0); push(x, 1); }
    for (let y = 0; y < Math.round(h * 0.8); y += 2) { push(0, y); push(w - 1, y); push(1, y); push(w - 2, y); }
    if (!px.length) return [[255, 255, 255]];
    let c = []; for (let i = 0; i < k; i++) c.push(px[Math.floor((i + 0.5) * px.length / k)].slice());
    for (let it = 0; it < 8; it++) {
      const s = c.map(() => [0, 0, 0, 0]);
      for (const p of px) { let bi = 0, bd = Infinity; c.forEach((q, j) => { const dd = dist2(p[0], p[1], p[2], q[0], q[1], q[2]); if (dd < bd) { bd = dd; bi = j; } }); const t = s[bi]; t[0] += p[0]; t[1] += p[1]; t[2] += p[2]; t[3]++; }
      c = s.map((t, j) => (t[3] ? [t[0] / t[3], t[1] / t[3], t[2] / t[3], t[3]] : c[j]));
    }
    // 가장자리의 5% 이상을 차지하는 색만 배경으로 본다
    return c.filter((q) => (q[3] || 0) >= px.length * 0.05);
  }

  function largestComponent(mask, w, h) {
    const lab = new Int32Array(w * h), sizes = [0]; let n = 0;
    const st = new Int32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (!mask[i] || lab[i]) continue;
      n++; let sp = 0, size = 0; st[sp++] = i; lab[i] = n;
      while (sp) { const p = st[--sp]; size++; const x = p % w, y = (p - x) / w;
        if (x > 0 && mask[p - 1] && !lab[p - 1]) { lab[p - 1] = n; st[sp++] = p - 1; }
        if (x < w - 1 && mask[p + 1] && !lab[p + 1]) { lab[p + 1] = n; st[sp++] = p + 1; }
        if (y > 0 && mask[p - w] && !lab[p - w]) { lab[p - w] = n; st[sp++] = p - w; }
        if (y < h - 1 && mask[p + w] && !lab[p + w]) { lab[p + w] = n; st[sp++] = p + w; } }
      sizes.push(size);
    }
    let best = 0; for (let j = 1; j <= n; j++) if (sizes[j] > (sizes[best] || 0)) best = j;
    const keepMin = (sizes[best] || 0) * 0.15;
    const out = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) if (lab[i] && sizes[lab[i]] >= keepMin) out[i] = 1;
    return out;
  }
  function blurAlpha(a, w, h, r) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) { tmp[y * w + x] = s / (2 * r + 1); s += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) { out[y * w + x] = s / (2 * r + 1); s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
    return out;
  }

  /** 배경 마스크(1=주인공) 계산. strength 0~100 */
  function subjectMask(img, strength) {
    const W = 360, k = Math.min(1, W / Math.max(img.width, img.height));
    const w = Math.max(8, Math.round(img.width * k)), h = Math.max(8, Math.round(img.height * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
    const id = x.getImageData(0, 0, w, h), d = id.data;
    const pal = borderPalette(d, w, h);
    const t2 = Math.pow(18 + strength * 1.1, 2) * 3, step = Math.pow(8 + strength * 0.38, 2) * 3;
    const bg = new Uint8Array(w * h), q = new Int32Array(w * h); let qh = 0, qt = 0;
    const near = (i) => { const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]; if (d[i * 4 + 3] < 20) return true; for (const p of pal) if (dist2(r, g, b, p[0], p[1], p[2]) < t2) return true; return false; };
    const seed = (i) => { if (!bg[i] && near(i)) { bg[i] = 1; q[qt++] = i; } };
    for (let xx = 0; xx < w; xx++) seed(xx);
    for (let yy = 0; yy < h; yy++) { seed(yy * w); seed(yy * w + w - 1); }
    while (qh < qt) {
      const p = q[qh++], px = p % w, py = (p - px) / w;
      const nb = [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, py > 0 ? p - w : -1, py < h - 1 ? p + w : -1];
      for (const n of nb) {
        if (n < 0 || bg[n]) continue;
        const sd = dist2(d[p * 4], d[p * 4 + 1], d[p * 4 + 2], d[n * 4], d[n * 4 + 1], d[n * 4 + 2]);
        if (sd < step && near(n)) { bg[n] = 1; q[qt++] = n; }
      }
    }
    let fg = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) fg[i] = bg[i] ? 0 : 1;
    fg = largestComponent(fg, w, h);
    let area = 0; for (let i = 0; i < w * h; i++) area += fg[i];
    return { fg, w, h, ratio: area / (w * h), canvas: c };
  }

  /** 결과 캐릭터 PNG(data URL)를 만든다.
   *  mode: 'cutout'(누끼) | 'circle'(동그랗게) | 'original'(그대로) */
  async function makeCharacter(src, { mode = 'cutout', strength = 50, outline = true } = {}) {
    const img = await loadImage(src);
    const S = 320, pad = outline ? 14 : 6;
    const out = document.createElement('canvas'); out.width = S; out.height = S;
    const o = out.getContext('2d');
    let used = mode;

    if (mode === 'cutout') {
      const m = subjectMask(img, strength);
      if (m.ratio < 0.04 || m.ratio > 0.96) used = 'circle'; // 주인공을 못 찾으면 동그랗게
      else {
        const { w, h, fg } = m;
        // 경계를 부드럽게
        const a = new Float32Array(w * h); for (let i = 0; i < w * h; i++) a[i] = fg[i];
        const soft = blurAlpha(a, w, h, 1);
        let x0 = w, y0 = h, x1 = 0, y1 = 0;
        for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) if (fg[y * w + xx]) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        // 고해상도 원본에 마스크 적용
        const hi = document.createElement('canvas'); const scale = Math.min(1, 900 / Math.max(img.width, img.height));
        hi.width = Math.round(img.width * scale); hi.height = Math.round(img.height * scale);
        const hx = hi.getContext('2d'); hx.drawImage(img, 0, 0, hi.width, hi.height);
        const mk = document.createElement('canvas'); mk.width = w; mk.height = h;
        const mx = mk.getContext('2d'); const md = mx.createImageData(w, h);
        for (let i = 0; i < w * h; i++) { md.data[i * 4 + 3] = Math.round(Math.min(1, soft[i] * 1.25) * 255); }
        mx.putImageData(md, 0, 0);
        hx.globalCompositeOperation = 'destination-in'; hx.imageSmoothingEnabled = true; hx.drawImage(mk, 0, 0, hi.width, hi.height);
        const fx = hi.width / w, cw = (x1 - x0 + 1) * fx, ch = (y1 - y0 + 1) * fx;
        const k2 = (S - pad * 2) / Math.max(cw, ch), dw = cw * k2, dh = ch * k2, dx = (S - dw) / 2, dy = S - pad - dh;
        const subj = document.createElement('canvas'); subj.width = S; subj.height = S;
        subj.getContext('2d').drawImage(hi, x0 * fx, y0 * fx, cw, ch, dx, dy, dw, dh);
        if (outline) stickerOutline(o, subj, S);
        o.drawImage(subj, 0, 0);
        return { dataURL: out.toDataURL('image/png'), mode: used };
      }
    }
    if (used === 'circle') {
      const r = S / 2 - pad, s = Math.min(img.width, img.height);
      o.save(); o.beginPath(); o.arc(S / 2, S / 2, r, 0, Math.PI * 2); o.closePath();
      if (outline) { o.shadowColor = 'rgba(0,0,0,.18)'; o.shadowBlur = 6; o.shadowOffsetY = 2; o.fillStyle = '#fff'; o.beginPath(); o.arc(S / 2, S / 2, r + 8, 0, Math.PI * 2); o.fill(); o.shadowColor = 'transparent'; }
      o.beginPath(); o.arc(S / 2, S / 2, r, 0, Math.PI * 2); o.clip();
      o.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, S / 2 - r, S / 2 - r, r * 2, r * 2);
      o.restore();
      return { dataURL: out.toDataURL('image/png'), mode: 'circle' };
    }
    // original
    const k3 = (S - pad * 2) / Math.max(img.width, img.height), dw = img.width * k3, dh = img.height * k3;
    o.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh);
    return { dataURL: out.toDataURL('image/png'), mode: 'original' };
  }
  // 스티커처럼 흰 테두리: 주인공 모양을 여러 방향으로 밀어 흰색으로 찍는다
  function stickerOutline(o, subj, S) {
    const t = document.createElement('canvas'); t.width = S; t.height = S; const tx = t.getContext('2d');
    for (let a = 0; a < 24; a++) { const ang = (a / 24) * Math.PI * 2; tx.drawImage(subj, Math.cos(ang) * 7, Math.sin(ang) * 7); }
    tx.globalCompositeOperation = 'source-in'; tx.fillStyle = '#ffffff'; tx.fillRect(0, 0, S, S);
    o.save(); o.shadowColor = 'rgba(0,0,0,.22)'; o.shadowBlur = 6; o.shadowOffsetY = 2; o.drawImage(t, 0, 0); o.restore();
  }

  root.Cutout = { makeCharacter, fileToDataURL, loadImage };
})(typeof self !== 'undefined' ? self : this);
