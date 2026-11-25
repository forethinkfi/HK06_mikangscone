(() => {
'use strict';
const P = window.MemoParse, C = window.Chars, api = window.api;
const { DAYMS, WD, pad, startOfDay, fmtTime, fmtWhen, fmtIn, fmtDate } = P;

/* ─────────── 도우미 ─────────── */
const $ = (s, r = document) => r.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k === 'value') el.value = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(kid)); }
  return el;
};
const ICONS = {
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-9 9"/>',
  star: '<path d="M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8z"/>',
  sparkle: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  bell: '<path d="M6 17h12l-1.5-2v-5a4.5 4.5 0 0 0-9 0v5z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', minus: '<path d="M5 12h14"/>',
  rotate: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>', check: '<path d="M5 12.5l4.5 4.5L19 7"/>', fold: '<path d="M9 5l7 7-7 7"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
  play: '<path d="M8 5.5v13l10-6.5z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M5.2 18.8l2.1-2.1M16.7 7.3l2.1-2.1"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  pin: '<path d="M9 3h6l-1 5 3 3H7l3-3z"/><path d="M12 11v10"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  board: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h4v4H7zM13 8h4v3h-4zM7 14h4v2H7zM13 13h4v3h-4z"/>',
};
const ico = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
const iel = (n, s = 18) => h('span', { html: ico(n, s), style: 'display:inline-grid;place-items:center' });
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const stageBox = () => document.getElementById('stage');
const W = () => (stageBox() && stageBox().clientWidth) || innerWidth, H = () => (stageBox() && stageBox().clientHeight) || innerHeight;

/* ─────────── 스타일 테마 ─────────── */
const THEMES = [
  { id: 'cherry', name: '체리 스캘럽', shape: 'scallop', stroke: '#d93a35', sw: 2.6, fill: '#fcf8ee', clip: { c: '#a9d3ee', e: '#7fb5da' }, clipX: 44, back: { t: 'g', a: '#b7cdee', b: '#eaf1fb' }, br: -2, tab: { bg: '#a9d3ee', ink: '#21425a' }, hl: 'rgba(217,58,53,.2)', hl2: 'rgba(169,211,238,.38)', rule: 'rgba(110,140,190,.3)', pad: '50px 40px 34px', orn: [{ t: 'starsilver', x: 2, y: 83, s: 58, r: -12 }] },
  { id: 'notebook', name: '레드 노트', shape: 'notebook', stroke: '#e4dccb', sw: 1.2, fill: '#fbf6ea', clip: { c: '#d6342e', e: '#a82320' }, clipX: 220, back: { t: 's', a: '#8f1f2c' }, br: 1.8, tab: { bg: '#d6342e', ink: '#ffffff' }, hl: 'rgba(214,52,46,.2)', hl2: 'rgba(214,52,46,.12)', rule: 'rgba(180,120,110,.3)', pad: '56px 34px 34px 58px', orn: [{ t: 'bowred', x: 73, y: 5, s: 96, r: 14 }] },
  { id: 'olive', name: '올리브 타원', shape: 'oval', stroke: '#8d9b86', ring: '#a9b5a2', sw: 2, fill: '#fbf6ea', clip: { c: '#f2ebd9', e: '#d3c9ae' }, clipX: 80, back: { t: 'g', a: '#aebcab', b: '#e6ece2' }, br: -2.5, tab: { bg: '#f2ebd9', ink: '#4b5645' }, hl: 'rgba(141,155,134,.34)', hl2: 'rgba(141,155,134,.22)', rule: 'rgba(120,135,112,.28)', pad: '86px 62px 76px', orn: [{ t: 'heartcream', x: 4, y: 84, s: 60, r: -8 }, { t: 'starsage', x: 85, y: 50, s: 50, r: 10 }] },
  { id: 'blue', name: '블루 스캘럽', shape: 'scallop', stroke: '#7d9cc8', sw: 1.8, fill: '#fcf8ee', clip: { c: '#cfd4da', e: '#98a1ac', metal: true }, clipX: 230, back: { t: 's', a: '#86a4c8' }, br: 2, tab: { bg: '#cfd4da', ink: '#2d3b4d' }, hl: 'rgba(125,156,200,.34)', hl2: 'rgba(125,156,200,.22)', rule: 'rgba(110,140,190,.3)', pad: '54px 44px 42px', orn: [{ t: 'heartsilver', x: 1, y: 84, s: 56, r: -8 }, { t: 'sealblue', x: 80, y: 84, s: 72, r: 0 }] },
  { id: 'butter', name: '버터 스티치', shape: 'stitch', stroke: '#e2cf9a', sw: 1.6, dash: '#c9a54a', fill: '#fcf8ee', clip: { c: '#f2dc8f', e: '#d6b955' }, clipX: 140, back: { t: 'g', a: '#f0d374', b: '#fbefc4' }, br: -2, tab: { bg: '#f2dc8f', ink: '#5a4712' }, hl: 'rgba(240,211,116,.55)', hl2: 'rgba(240,211,116,.32)', rule: 'rgba(200,165,80,.3)', pad: '54px 44px 40px', orn: [{ t: 'buttonstar', x: 0, y: 1, s: 60, r: -10 }] },
  { id: 'pink', name: '핑크 타원', shape: 'oval', stroke: '#eaa6b6', ring: '#f3c3cf', sw: 2, fill: '#fcf8f1', clip: { c: '#f2a9b9', e: '#d98698' }, clipX: 230, back: { t: 's', a: '#f3b9c5' }, br: 2.5, tab: { bg: '#f2a9b9', ink: '#5a2331' }, hl: 'rgba(242,169,185,.5)', hl2: 'rgba(242,169,185,.3)', rule: 'rgba(225,150,168,.3)', pad: '86px 62px 76px', orn: [{ t: 'starsilver', x: 2, y: 80, s: 60, r: -10 }, { t: 'bowpink', x: 78, y: 86, s: 70, r: 8 }] },
];
const TH = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

/* ─────────── 스티커 ─────────── */
const starP = 'M24 4l5.6 13.2 14.4 1.2-11 9.4 3.4 14L24 34.6 11.6 41.8l3.4-14-11-9.4 14.4-1.2z';
const heartP = 'M24 42C8 30 4 21 4 15 4 9 9 5 14 5c4 0 8 2.5 10 6 2-3.5 6-6 10-6 5 0 10 4 10 10 0 6-4 15-20 27z';
const star = (b, hi) => `<path d="${starP}" fill="${b}" stroke="${b}" stroke-width="4" stroke-linejoin="round"/><path d="M24 10l4 9.5 10 .9-7.6 6.6 2.4 9.8L24 31.2l-8.8 5.6 2.4-9.8L10 20.4l10-.9z" fill="${hi}" opacity=".85"/><path d="M24 10l4 9.5-4 3.5-4-3.5z" fill="#fff" opacity=".6"/>`;
const heart = (b, hi) => `<path d="${heartP}" fill="${b}" stroke="${b}" stroke-width="2" stroke-linejoin="round"/><path d="M11 14c1.5-3 5-4.5 8-3" stroke="${hi}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".9"/>`;
const bow = (fill, line) => `<path d="M30 20C20 3 3 5 3 18c0 13 17 17 27 2z" fill="${fill}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/><path d="M30 20C40 3 57 5 57 18c0 13-17 17-27 2z" fill="${fill}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/><path d="M27 24L18 38l9-3 3-8zM33 24l9 14-9-3-3-8z" fill="${fill}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/><rect x="24.5" y="13" width="11" height="13" rx="5.5" fill="${fill}" stroke="${line}" stroke-width="1.6"/>`;
const STK = {
  starsilver: { n: '은별', vb: '0 0 48 48', w: 56, svg: star('#aab2bc', '#e9edf1') },
  starsage: { n: '세이지 별', vb: '0 0 48 48', w: 50, svg: star('#8fa388', '#bccbb5') },
  heartsilver: { n: '은하트', vb: '0 0 48 48', w: 54, svg: heart('#aab2bc', '#f1f4f7') },
  heartcream: { n: '크림 하트', vb: '0 0 48 48', w: 56, svg: heart('#f5eddf', '#ffffff') + `<path d="${heartP}" fill="none" stroke="#e1d4bd" stroke-width="1.6"/>` },
  bowpink: { n: '핑크 리본', vb: '0 0 60 40', w: 70, svg: bow('#f4a7ba', '#d97d95') },
  bowred: { n: '체크 리본', vb: '0 0 60 40', w: 92, svg: bow('url(#g-red)', '#b92a28') },
  sealblue: { n: '왁스 씰', vb: '0 0 60 60', w: 66, svg: '<circle cx="30" cy="30" r="27" fill="#8ba3c7"/><circle cx="30" cy="30" r="21" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.6"/><path d="M30 31c-6-8-12-5-11 0 1 5 8 5 11 0zM30 31c6-8 12-5 11 0-1 5-8 5-11 0zM28 33l-4 9M32 33l4 9" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' },
  buttonstar: { n: '별 단추', vb: '0 0 48 48', w: 56, svg: `<path d="${starP}" fill="#f6efe4" stroke="#f6efe4" stroke-width="7" stroke-linejoin="round"/><circle cx="20.5" cy="23" r="2" fill="#cdbfa8"/><circle cx="27.5" cy="23" r="2" fill="#cdbfa8"/><circle cx="20.5" cy="30" r="2" fill="#cdbfa8"/><circle cx="27.5" cy="30" r="2" fill="#cdbfa8"/>` },
  tape: { n: '마스킹 테이프', vb: '0 0 80 26', w: 90, svg: '<path d="M4 1L76 1 72 5 76 9 72 13 76 17 72 21 76 25 4 25 8 21 4 17 8 13 4 9 8 5Z" fill="#f6c6d0" fill-opacity=".85"/><path d="M14 1v24M30 1v24M46 1v24M62 1v24" stroke="#fff" stroke-opacity=".5" stroke-width="5"/>' },
};
const PAL = Object.keys(STK);
const stkSVG = (t) => { const d = STK[t]; return `<svg viewBox="${d.vb}" aria-hidden="true">${d.svg}</svg>`; };

/* ─────────── 종이 · 클립 SVG ─────────── */
function scallop(Wd, Ht, m = 12, d = 22) {
  const x0 = m, y0 = m, w = Wd - 2 * m, hh = Ht - 2 * m, nx = Math.round(w / d), ny = Math.round(hh / d), dx = w / nx, dy = hh / ny;
  let p = `M${x0} ${y0}`;
  for (let i = 1; i <= nx; i++) p += `A${dx / 2} ${dx / 2} 0 0 1 ${x0 + i * dx} ${y0}`;
  for (let i = 1; i <= ny; i++) p += `A${dy / 2} ${dy / 2} 0 0 1 ${x0 + w} ${y0 + i * dy}`;
  for (let i = 1; i <= nx; i++) p += `A${dx / 2} ${dx / 2} 0 0 1 ${x0 + w - i * dx} ${y0 + hh}`;
  for (let i = 1; i <= ny; i++) p += `A${dy / 2} ${dy / 2} 0 0 1 ${x0} ${y0 + hh - i * dy}`;
  return p + 'Z';
}
function notebookPath(Wd, Ht) {
  const x0 = 16, y0 = 16, w = Wd - 32, hh = Ht - 32, r = 8;
  let p = `M${x0 + r} ${y0}H${x0 + w - r}Q${x0 + w} ${y0} ${x0 + w} ${y0 + r}V${y0 + hh - r}Q${x0 + w} ${y0 + hh} ${x0 + w - r} ${y0 + hh}H${x0 + r}Q${x0} ${y0 + hh} ${x0} ${y0 + hh - r}`;
  const ys = []; for (let i = 0; i < 10; i++) ys.push(70 + i * (hh - 110) / 9);
  for (const y of ys.reverse()) p += `V${y + 8}A8 8 0 0 0 ${x0} ${y - 8}`;
  return p + `V${y0 + r}Q${x0} ${y0} ${x0 + r} ${y0}Z`;
}
function paperSVG(t, Wd = 420, Ht = 560) {
  let b = '';
  if (t.shape === 'scallop') b = `<path d="${scallop(Wd, Ht)}" fill="${t.fill}" stroke="${t.stroke}" stroke-width="${t.sw}" stroke-linejoin="round"/>`;
  else if (t.shape === 'notebook') b = `<path d="${notebookPath(Wd, Ht)}" fill="${t.fill}" stroke="${t.stroke}" stroke-width="${t.sw}"/>`;
  else if (t.shape === 'oval') b = `<ellipse cx="210" cy="280" rx="194" ry="262" fill="${t.fill}" stroke="${t.stroke}" stroke-width="${t.sw}"/><ellipse cx="210" cy="280" rx="181" ry="249" fill="none" stroke="${t.ring}" stroke-width="1.5"/>`;
  else b = `<rect x="12" y="12" width="396" height="536" rx="30" fill="${t.fill}" stroke="${t.stroke}" stroke-width="${t.sw}"/><rect x="27" y="27" width="366" height="506" rx="20" fill="none" stroke="${t.dash}" stroke-width="1.8" stroke-dasharray="7 6" stroke-linecap="round"/>`;
  return `<svg class="paper" viewBox="0 0 ${Wd} ${Ht}" preserveAspectRatio="none" aria-hidden="true">${b}</svg>`;
}
function clipSVG(c, left = 0) {
  let wave = ''; for (let i = 0; i < 12; i++) wave += 'a5 5 0 0 1 -10 0';
  const bar = `M17 28H113Q125 28 125 40V56${wave}V40Q5 28 17 28Z`;
  const grooves = c.metal ? `<path d="M34 36v16M46 36v16M58 36v16M70 36v16M82 36v16M94 36v16" stroke="${c.e}" stroke-width="1.6" opacity=".85"/>` : '';
  return `<svg class="clip" style="left:${left}px" viewBox="0 0 130 70" aria-hidden="true"><path fill-rule="evenodd" d="M65 3a15 15 0 0 1 15 15v12H50V18A15 15 0 0 1 65 3zm0 9a6 6 0 0 0-6 6v10h12V18a6 6 0 0 0-6-6z" fill="${c.c}" stroke="${c.e}" stroke-width="1.2"/><path d="${bar}" fill="${c.c}" stroke="${c.e}" stroke-width="1.4" stroke-linejoin="round"/>${grooves}<path d="M18 35H112" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/></svg>`;
}

/* ─────────── 상태 · 저장 ─────────── */
const DEFAULTS = {
  character: 'mikang', petName: '', customChar: '', side: 'right',
  modeOverride: 'auto', petTarget: 'all', peek: true, peekDelay: 350,
  autoOrganize: true, preDeadline: 60, preNormal: 10, morningBrief: true,
  launchAtLogin: true, petPos: null, consentShown: false, showWidget: true, weatherCity: '서울',
};
let S = null, saveT = 0;
let saveWarned = false;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(async () => {
    const ok = await api.saveState(S).catch(() => false);
    if (ok === false && !saveWarned) { saveWarned = true; toast({ title: '저장 공간이 부족해요', body: '사진을 몇 장 지우면 다시 저장돼요.', ttl: 6000 }); }
    if (ok) saveWarned = false;
  }, 300);
}
const byId = (id) => S.notes.find((n) => n.id === id);
const isEmpty = (n) => !n.text.trim() && !n.title.trim() && !n.keyword.trim() && !n.photos.length && !n.stickers.length && !n.audios.length;

/* ─────────── 섹션 (큰 책갈피) ─────────── */
// 책갈피는 섹션(업무·생활·아이디어 …) 단위로 붙고, 섹션을 누르면 그 안의 메모 책갈피가 펼쳐진다.
const SEC_COLORS = [{ bg: '#a9d3ee', ink: '#21425a' }, { bg: '#f2a9b9', ink: '#5a2331' }, { bg: '#f2dc8f', ink: '#5a4712' }, { bg: '#b9d8b0', ink: '#2f4a2a' }, { bg: '#d6c5f0', ink: '#3d2d5c' }, { bg: '#f7c39a', ink: '#5c3214' }, { bg: '#cfd4da', ink: '#2d3b4d' }, { bg: '#d6342e', ink: '#ffffff' }];
const INBOX = { id: '', name: '분류 없음', color: 6 };
const DEFAULT_SECTIONS = () => [{ id: 's-work', name: '업무', color: 0 }, { id: 's-life', name: '생활', color: 3 }, { id: 's-idea', name: '아이디어', color: 1 }];
const secById = (id) => S.sections.find((x) => x.id === id);
const secIdOf = (n) => (n.sectionId && secById(n.sectionId) ? n.sectionId : '');
const secOf = (n) => secById(secIdOf(n)) || INBOX;
const secColor = (x) => SEC_COLORS[(x.color || 0) % SEC_COLORS.length];
const notesIn = (id) => S.notes.filter((n) => secIdOf(n) === id);
const SEC_HINTS = [
  [/업무|회사|일|프로젝트|직장|학교|공부/, /회의|미팅|발표|제출|마감|보고|기획|업무|자료|출장|메일|프로젝트|고객|계약|과제|시험|수업/],
  [/생활|일상|집|개인|가족/, /장보기|마트|병원|치과|택배|청소|운동|약속|생일|가족|요리|은행|결제|예약|여행|우유|빨래|약/],
  [/아이디어|생각|영감|메모/, /아이디어|후보|생각|영감|이름|떠오른/],
];
function guessSection(n) {
  const text = `${n.keyword} ${n.title} ${n.text}`;
  for (const [nameRe, textRe] of SEC_HINTS) { if (!textRe.test(text)) continue; const x = S.sections.find((y) => nameRe.test(y.name)); if (x) return x.id; }
  return '';
}
function addSection(name) {
  name = String(name || '').trim().slice(0, 10); if (!name) return null;
  const ex = S.sections.find((x) => x.name === name); if (ex) return ex;
  const x = { id: 's-' + uid(), name, color: S.sections.length % SEC_COLORS.length };
  S.sections.push(x); save(); return x;
}
let openSec = null, addingSec = false, dockFolded = false, modalKind = '';
function toggleSection(id) { openSec = openSec === id ? null : id; renderTabs(); }

let ctx = 'desktop', fgBrowser = false, forcedMode = null;
let summoned = false, openId = null, agendaOpen = false, selStk = null, modalOpen = false;
let bubble = { open: false, menu: false, t: 0 };
let peek = { open: false, side: null, idx: 0, list: [], hideT: 0 };
let cursor = { x: -1, y: -1, edge: null }, interactive = false, dragging = false;
let keys = { anthropic: false, openai: false }, info = { platform: '', demo: false };
let rec = null, mood = 'idle', moodT = 0;
let player = null;

/* ─────────── 모드: 바탕화면이면 책갈피, 앱을 쓰면 캐릭터만 ─────────── */
function petMode() {
  const o = forcedMode || S.settings.modeOverride;
  if (o === 'pet') return true;
  if (o === 'desktop') return false;
  if (ctx !== 'app') return false;
  return S.settings.petTarget === 'browser' ? fgBrowser : true;
}
function applyMode() {
  const pm = petMode();
  const showDock = (!pm && !dockFolded) || summoned || !!openId || agendaOpen;
  const st = $('#stage');
  st.classList.toggle('dock-hidden', !showDock);
  st.classList.toggle('pet-mode', pm);
  const bg = $('#demoBg'); if (bg) bg.classList.toggle('desktop', !pm);
  placePet();
  updateHit();
}

/* ─────────── 클릭 통과 판정 ─────────── */
const HIT = '.tab,.subs,.sheet.open,.pet:not(.hide),.bubble,.peek.open,.toast,.modal,.widget';
function setInter(on) { if (on !== interactive) { interactive = on; api.setInteractive(on); } }
function updateHit() {
  if (modalOpen || dragging) { setInter(true); return; }
  if (cursor.x < 0) { setInter(false); return; }
  const el = document.elementFromPoint(cursor.x, cursor.y);
  setInter(!!(el && el.closest(HIT)));
}

/* ─────────── 책갈피 ─────────── */
function nextEvent(n) {
  const now = Date.now(); let best = null;
  for (const e of n.events) if (e.alarm && !e.done && !e.fired && e.at >= now - 60000 && (!best || e.at < best.at)) best = e;
  return best;
}
function upcomingCount() {
  const t0 = startOfDay(new Date()).getTime();
  return S.notes.reduce((a, n) => a + n.events.filter((e) => !e.done && e.at >= t0 && e.at < t0 + DAYMS).length, 0);
}
function renderTabs() {
  const dock = $('#dock'); dock.replaceChildren();
  dock.append(h('button', { class: 'tab add', type: 'button', onclick: () => newNote(true, openSec ?? undefined), 'aria-label': '새 메모 만들기' }, h('span', { class: 'k', style: 'display:flex;align-items:center;gap:5px' }, iel('plus', 15), '새 메모')));
  const secs = [...S.sections]; if (notesIn('').length) secs.push(INBOX);
  for (const x of secs) {
    const list = notesIn(x.id), c = secColor(x), exp = openSec === x.id;
    let nx = null; for (const n of list) { const e = nextEvent(n); if (e && (!nx || e.at < nx.at)) nx = e; }
    const tab = h('button', { class: 'tab sec' + (exp ? ' exp' : '') + (list.some((n) => n.ring) ? ' ring' : ''), type: 'button', 'data-sec': x.id, 'aria-expanded': String(exp), title: `${x.name} · 메모 ${list.length}개 (눌러서 ${exp ? '접기' : '펼치기'})`, style: `--tc:${c.bg};--ti:${c.ink}`, onclick: () => toggleSection(x.id) },
      h('span', { class: 'k' }, h('span', { class: 'sname' }, x.name), h('span', { class: 'cnt' }, String(list.length))),
      nx ? h('span', { class: 'when' }, iel('bell', 11), fmtWhen(nx.at)) : null);
    bindImageDrop(tab, () => null, () => newNote(false, x.id));
    dock.append(tab);
    if (exp) {
      const wrap = h('div', { class: 'subs', role: 'group', 'aria-label': `${x.name} 메모` });
      list.forEach((n, i) => {
        const t = TH(n.theme), ne = nextEvent(n);
        const st = h('button', { class: 'tab sub' + (openId === n.id ? ' open' : '') + (n.ring ? ' ring' : ''), type: 'button', 'data-id': n.id, title: n.title || n.keyword, style: `--tc:${t.tab.bg};--ti:${t.tab.ink};--d:${i * 35}ms`, onclick: () => toggleNote(n.id) },
          h('span', { class: 'k' }, n.keyword || '새 메모'), ne ? h('span', { class: 'when' }, iel('bell', 10), fmtWhen(ne.at)) : null);
        bindImageDrop(st, () => byId(n.id));
        wrap.append(st);
      });
      wrap.append(h('button', { class: 'tab sub addsub', type: 'button', style: `--d:${list.length * 35}ms`, onclick: () => newNote(true, x.id) }, h('span', { class: 'k', style: 'display:flex;align-items:center;gap:4px' }, iel('plus', 13), '여기에 새 메모')));
      dock.append(wrap);
    }
  }
  if (addingSec) {
    const done = (save1) => { if (!addingSec) return; addingSec = false; const x = save1 ? addSection(inp.value) : null; if (x) openSec = x.id; renderTabs(); };
    const inp = h('input', { id: 'secNew', class: 'secinput', type: 'text', maxlength: '10', placeholder: '섹션 이름', 'aria-label': '새 섹션 이름',
      onkeydown: (e) => { if (e.key === 'Enter' && !e.isComposing) done(true); else if (e.key === 'Escape') { e.stopPropagation(); done(false); } },
      onblur: () => setTimeout(() => done(true), 120) });
    dock.append(h('div', { class: 'tab add secform' }, inp));
  } else {
    dock.append(h('button', { class: 'tab add secadd', type: 'button', title: '큰 책갈피(섹션) 만들기', onclick: () => { addingSec = true; renderTabs(); api.focus(); setTimeout(() => { const i = $('#secNew'); i && i.focus(); }, 40); } },
      h('span', { class: 'k', style: 'display:flex;align-items:center;gap:5px' }, iel('folder', 14), '섹션 추가')));
  }
  const cnt = upcomingCount();
  dock.append(h('button', { class: 'tab agenda' + (agendaOpen ? ' open' : ''), type: 'button', 'aria-expanded': String(agendaOpen), onclick: toggleAgenda },
    h('span', { class: 'k', style: 'display:flex;align-items:center;gap:5px' }, iel('cal', 15), '일정'),
    cnt ? h('span', { class: 'when' }, `오늘 ${cnt}개`) : null));
  renderPetBadges(); renderWidget();
}
function setTabText(n) { const b = $(`.tab[data-id="${n.id}"] .k`); if (b) b.textContent = n.keyword || '새 메모'; }

function fit() {
  const s = Math.min(clamp((H() - 84 - 14) / 676, .5, 1), clamp((W() - 150 - 16) / 420, .5, 1), 1).toFixed(3);
  $('#sheet').style.setProperty('--s', s); $('#agenda').style.setProperty('--s', s);
}

/* ─────────── 열기 · 닫기 ─────────── */
const noteHash = (n) => n.title + '\u0001' + n.text + '\u0001' + n.photos.length;
function commitCurrent() {
  const n = openId && byId(openId); if (!n) return;
  if (isEmpty(n) && !(rec && rec.noteId === n.id)) { S.notes = S.notes.filter((x) => x !== n); return; }
  if (!n.keyword.trim() && (n.text.trim() || n.title.trim())) n.keyword = P.guessKeyword(n.text, n.title);
  if (!n.summary.length && n.text.trim()) n.summary = P.summarize(n.text);
  if (!n.secManual && !secIdOf(n)) { const g = guessSection(n); if (g) n.sectionId = g; }
  // 자동화: 내용이 바뀐 채로 접으면 비서가 알아서 정리하고 알람까지 맞춘다
  if (S.settings.autoOrganize && (n.text.trim() || (keys.anthropic && n.photos.length)) && n.orgHash !== noteHash(n)) organizeNote(n, { auto: true });
}
function closeAll() {
  commitCurrent();
  openId = null; agendaOpen = false; selStk = null; summoned = false;
  $('#sheet').classList.remove('open'); $('#agenda').classList.remove('open');
  closeBubble();
  renderTabs(); applyMode(); save();
  api.release();
}
function toggleNote(id) { if (openId === id) closeAll(); else openNote(id); }
function openNote(id) {
  const n = byId(id); if (!n) return;
  if (openId && openId !== id) commitCurrent();
  closePeek(true); closeBubble();
  agendaOpen = false; $('#agenda').classList.remove('open');
  openId = n.id; n.ring = false; n.viewedAt = Date.now(); selStk = null; openSec = secIdOf(n);
  renderCard(n); fit();
  $('#sheet').classList.add('open');
  renderTabs(); applyMode(); save();
  api.focus();
}
function toggleAgenda() {
  if (agendaOpen) { closeAll(); return; }
  commitCurrent(); closePeek(true); closeBubble();
  openId = null; $('#sheet').classList.remove('open');
  agendaOpen = true; renderAgenda(); fit();
  $('#agenda').classList.add('open');
  renderTabs(); applyMode();
}
function blankNote(sectionId) {
  const idx = ((S.nextTheme || 0) + 1) % THEMES.length; S.nextTheme = idx;
  const sec = sectionId ?? openSec ?? '';
  return { id: uid(), theme: THEMES[idx].id, sectionId: sec, secManual: !!sec, title: '', text: '', keyword: '', kwManual: false, summary: [], events: [], photos: [], stickers: [], audios: [], aiSource: '', createdAt: Date.now(), viewedAt: Date.now(), orgHash: '' };
}
function newNote(focus = true, sectionId) {
  if (openId) commitCurrent();
  const n = blankNote(sectionId);
  S.notes.unshift(n); save(); openNote(n.id);
  if (focus) setTimeout(() => { const t = $('#sheet .body'); t && t.focus(); }, 80);
  return n;
}

/* ─────────── 메모지 카드 ─────────── */
function perchHTML() { return C.charHTML(S.settings.character, S.settings.customChar); }
function charColor() { return (C.CHARS[S.settings.character] || C.CHARS.mikang).color; }
function renderCard(n) {
  const t = TH(n.theme), sheet = $('#sheet');
  const card = h('div', { class: 'card', 'data-id': n.id, style: `--pad:${t.pad};--hl:${t.hl};--hl2:${t.hl2};--rule:${t.rule};--br:${t.br}deg` });
  const bk = t.back;
  card.append(h('div', { class: 'backing', style: bk.t === 'g'
    ? `background-color:${bk.b};background-image:linear-gradient(90deg,${bk.a}99 50%,transparent 50%),linear-gradient(${bk.a}99 50%,transparent 50%);background-size:24px 24px`
    : `background:${bk.a}` }));
  card.insertAdjacentHTML('beforeend', paperSVG(t));
  card.insertAdjacentHTML('beforeend', clipSVG(t.clip, t.clipX));

  // 메모지 위에 앉은 캐릭터 — 누르면 AI 정리
  const perchLeft = t.clipX < 200 ? 300 : 34;
  const perch = h('div', { class: 'perch mood-' + mood + (perchLeft > 200 ? ' r' : ' l'), id: 'perch', title: '눌러서 AI 정리', style: `left:${perchLeft}px;--pc:${charColor()}`, onclick: () => organizeNote(n, {}) });
  perch.innerHTML = perchHTML() + '<div class="paws"><i></i><i></i></div>';
  perch.append(h('div', { class: 'say', id: 'perchSay' }));
  card.append(perch);

  const kw = h('input', { class: 'kw', type: 'text', maxlength: '8', placeholder: '키워드', 'aria-label': '큰 키워드', value: n.keyword,
    oninput: (e) => { n.keyword = e.target.value; n.kwManual = true; setTabText(n); save(); } });
  const ttl = h('input', { class: 'ttl', type: 'text', maxlength: '40', placeholder: '제목 (선택)', 'aria-label': '제목', value: n.title,
    oninput: (e) => { n.title = e.target.value; save(); } });
  const body = h('textarea', { class: 'body', placeholder: '여기에 메모를 적어요.\n예) 내일 12시까지 회의자료 제출', 'aria-label': '메모 내용',
    oninput: (e) => { n.text = e.target.value; save(); },
    onblur: () => { if (!n.keyword.trim() && n.text.trim()) { n.keyword = P.guessKeyword(n.text, n.title); kw.value = n.keyword; setTabText(n); } renderChips(n); save(); },
    onpaste: (e) => { const fs = imageFiles(e.clipboardData?.files); if (fs.length) { e.preventDefault(); addPhotos(n, fs); } } });
  body.value = n.text;
  const content = h('div', { class: 'content' }, kw, h('div', { class: 'ttlrow' }, ttl, sectionPicker(n)));
  if (n.summary.length) content.append(h('div', { class: 'sum' },
    h('div', { class: 'sh' }, iel('sparkle', 12), n.aiSource === 'claude' ? `${C.charName(S)}가 정리한 요점` : '요점 (기본 규칙으로 정리)'),
    h('ul', {}, n.summary.map((s) => h('li', {}, s)))));
  if (rec && rec.noteId === n.id) content.append(recBar());
  content.append(body);
  if (n.audios.length) content.append(h('div', { class: 'audios' }, n.audios.map((a) => audioChip(n, a))));
  if (n.photos.length) content.append(h('div', { class: 'photos' },
    n.photos.map((src, i) =>
      h('div', { class: 'ph', style: `--r:${(i % 2 ? 1 : -1) * (1 + i % 3)}deg` },
        h('button', { type: 'button', class: 'pv-open', 'aria-label': `사진 ${i + 1} 크게 보기`, title: '크게 보기', onclick: () => openViewer(n, i) },
          h('img', { src: /^data:image\//.test(src) ? src : '', alt: `첨부 사진 ${i + 1}` })),
        h('div', { class: 'pa' },
          h('button', { type: 'button', 'aria-label': '스티커로 붙이기', title: '스티커로 붙이기', onclick: () => photoToSticker(n, i), html: ico('star', 13) }),
          h('button', { type: 'button', 'aria-label': '사진 삭제', title: '삭제', onclick: () => { n.photos.splice(i, 1); save(); renderCard(n); }, html: ico('x', 13) })))),
    n.photos.length < MAX_PHOTOS ? filePicker({ cls: 'ph-add', label: '사진 더 넣기', onFiles: (fs) => addPhotos(n, fs) }, iel('plus', 20)) : null));
  content.append(h('div', { class: 'chips', id: 'chips' }));
  card.append(content);
  card.append(h('div', { class: 'stk-layer', id: 'stkLayer' }));
  for (const o of t.orn) card.append(h('div', { class: 'orn', style: `left:${o.x}%;top:${o.y}%;width:${o.s}px;transform:rotate(${o.r}deg)`, html: stkSVG(o.t) }));

  card.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); card.classList.add('drop'); } });
  card.addEventListener('dragleave', (e) => { if (!card.contains(e.relatedTarget)) card.classList.remove('drop'); });
  card.addEventListener('drop', (e) => { card.classList.remove('drop'); const fs = imageFiles(e.dataTransfer?.files); if (fs.length) { e.preventDefault(); addPhotos(n, fs); } });
  card.addEventListener('pointerdown', (e) => { if (!e.target.closest('.stk,.sbar') && selStk) { selStk = null; renderStickers(n); } });

  const pal = h('div', { class: 'pal', hidden: true, role: 'menu', 'aria-label': '스티커' }, PAL.map((k) => h('button', { type: 'button', role: 'menuitem', 'aria-label': STK[k].n, title: STK[k].n, onclick: () => { pal.hidden = true; addSticker(n, k); }, html: stkSVG(k) })));
  const aiBtn = h('button', { class: 'btn primary', type: 'button', id: 'aiBtn', onclick: () => organizeNote(n, {}) }, iel('sparkle', 16), 'AI 정리');
  const recOn = rec && rec.noteId === n.id;
  const recBtn = h('button', { class: 'btn rec' + (recOn ? ' on' : ''), type: 'button', id: 'recBtn', onclick: () => (recOn ? stopRecording() : startRecording(n, 'note')) }, iel(recOn ? 'stop' : 'mic', 16), recOn ? '정지' : '녹음');
  let armed = 0;
  const delBtn = h('button', { class: 'btn icon del', type: 'button', 'aria-label': '메모 삭제', title: '메모 삭제', onclick: () => {
    if (!armed) { armed = 1; delBtn.classList.add('armed'); delBtn.textContent = '정말 삭제?'; setTimeout(() => { if (armed) { armed = 0; delBtn.classList.remove('armed'); delBtn.replaceChildren(iel('trash', 16)); } }, 3000); return; }
    for (const a of n.audios) api.deleteAudio(a.id);
    S.notes = S.notes.filter((x) => x !== n); openId = null; save(); closeAll();
  } }, iel('trash', 16));
  const bar = h('div', { class: 'bar' }, pal,
    h('div', { class: 'row' },
      h('button', { class: 'btn icon fold', type: 'button', 'aria-label': '책갈피로 접기', title: '책갈피로 접기', onclick: closeAll, html: ico('fold', 16) }),
      recBtn,
      filePicker({ cls: 'btn', title: '내 컴퓨터에서 사진 고르기', onFiles: (fs) => addPhotos(n, fs) }, iel('image', 16), '사진'),
      h('button', { class: 'btn', type: 'button', 'aria-haspopup': 'menu', onclick: () => { pal.hidden = !pal.hidden; } }, iel('star', 16), '스티커'),
      h('span', { style: 'margin-left:auto' }), aiBtn),
    h('div', { class: 'row' },
      h('span', { class: 'lbl' }, '스타일'),
      THEMES.map((x) => h('button', { class: 'sw', type: 'button', 'aria-label': x.name, title: x.name, 'aria-pressed': String(x.id === n.theme), style: `background:${x.clip.c}`, onclick: () => { n.theme = x.id; save(); renderCard(n); renderTabs(); } })),
      h('span', { style: 'margin-left:auto' }), delBtn));
  sheet.replaceChildren(card, bar);
  renderStickers(n); renderChips(n);
}

/** 메모지 위쪽의 '분류' 고르기. 새 섹션도 바로 만들 수 있다. */
function sectionPicker(n) {
  const wrap = h('span', { class: 'secpick' });
  const setSec = (id) => { n.sectionId = id; n.secManual = true; openSec = id; save(); renderTabs(); draw(); };
  function draw() {
    const x = secOf(n), c = secColor(x);
    const sel = h('select', { class: 'secsel', 'aria-label': '분류(섹션)', title: '이 메모를 넣을 섹션', style: `--tc:${c.bg};--ti:${c.ink}`,
      onchange: (e) => {
        if (e.target.value !== '__new') { setSec(e.target.value); return; }
        const fin = (ok) => { if (!inp.isConnected) return; const ns = ok ? addSection(inp.value) : null; if (ns) setSec(ns.id); else draw(); };
        const inp = h('input', { class: 'secsel', type: 'text', maxlength: '10', placeholder: '새 섹션 이름', 'aria-label': '새 섹션 이름',
          onkeydown: (ev) => { if (ev.key === 'Enter' && !ev.isComposing) fin(true); else if (ev.key === 'Escape') { ev.stopPropagation(); fin(false); } },
          onblur: () => setTimeout(() => fin(true), 120) });
        wrap.replaceChildren(inp); inp.focus();
      } },
      S.sections.map((y) => h('option', { value: y.id, selected: y.id === secIdOf(n) }, y.name)),
      h('option', { value: '', selected: secIdOf(n) === '' }, '분류 없음'),
      h('option', { value: '__new' }, '＋ 새 섹션 만들기…'));
    wrap.replaceChildren(iel('folder', 14), sel);
  }
  draw();
  return wrap;
}
function perchSay(text, ttl = 3500) {
  const el = $('#perchSay'); if (!el) return;
  el.textContent = text; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), ttl);
}

function renderChips(n) {
  const box = $('#chips'); if (!box) return; box.replaceChildren();
  for (const e of n.events) {
    box.append(h('span', { class: 'chip' + (e.alarm && !e.done ? '' : ' off') },
      e.deadline ? h('span', { class: 'dl' }, '마감') : null,
      `${fmtWhen(e.at)} ${e.title}`,
      h('button', { type: 'button', class: e.alarm ? 'on' : '', 'aria-label': '알람 켜기/끄기', title: e.alarm ? '알람 끄기' : '알람 켜기', onclick: () => { e.alarm = !e.alarm; if (e.alarm && e.at > Date.now()) { e.fired = false; e.preFired = false; } save(); renderChips(n); renderTabs(); }, html: ico('bell', 14) }),
      h('button', { type: 'button', 'aria-label': '일정 삭제', onclick: () => { n.events = n.events.filter((x) => x !== e); save(); renderChips(n); renderTabs(); }, html: ico('x', 13) })));
  }
  for (const c of candidates(n)) {
    box.append(h('span', { class: 'chip cand' }, h('button', { type: 'button', title: '알람으로 등록', onclick: () => { addEvent(n, c); save(); renderChips(n); renderTabs(); refreshAgenda(); } }, iel('plus', 13), `알람 ${fmtWhen(c.at)} ${c.title}`)));
  }
}

/* ─────────── 녹음 파일 ─────────── */
const fmtDur = (s) => `${Math.floor(s / 60)}:${pad(Math.round(s % 60))}`;
function audioChip(n, a) {
  const playing = player && player.id === a.id && !player.el.paused;
  return h('span', { class: 'au', title: a.transcript ? '받아쓴 내용: ' + a.transcript.slice(0, 120) : '녹음' },
    h('button', { type: 'button', class: 'play', 'aria-label': playing ? '일시정지' : '재생', onclick: () => togglePlay(n, a), html: ico(playing ? 'pause' : 'play', 12) }),
    `${new Date(a.at).getMonth() + 1}/${new Date(a.at).getDate()} ${fmtTime(new Date(a.at))} · ${fmtDur(a.dur || 0)}`,
    h('button', { type: 'button', 'aria-label': '녹음 삭제', onclick: () => { api.deleteAudio(a.id); n.audios = n.audios.filter((x) => x !== a); save(); renderCard(n); }, html: ico('x', 12) }));
}
async function togglePlay(n, a) {
  if (player && player.id === a.id) { if (player.el.paused) player.el.play(); else player.el.pause(); renderCard(n); return; }
  if (player) { player.el.pause(); URL.revokeObjectURL(player.url); player = null; }
  const buf = await api.readAudio(a.id);
  if (!buf) { toast({ title: '녹음 파일을 찾지 못했어요', ttl: 2500 }); return; }
  const url = URL.createObjectURL(new Blob([buf], { type: a.mime || 'audio/webm' }));
  const el = new Audio(url);
  player = { id: a.id, el, url };
  el.onended = el.onpause = el.onplay = () => { if (openId === n.id) renderCard(n); };
  el.play();
}

/* ─────────── 사진 · 스티커 ─────────── */
const MAX_PHOTOS = 6;
const IMG_EXT = /\.(jpe?g|jfif|pjpeg|pjp|png|apng|gif|webp|bmp|dib|svg|avif|heic|heif|ico|cur|tiff?)$/i;
const isImageFile = (f) => !!f && ((f.type || '').startsWith('image/') || IMG_EXT.test(f.name || ''));
const imageFiles = (list) => [...(list || [])].filter(isImageFile);
const ACCEPT = 'image/*,.heic,.heif,.tif,.tiff,.avif,.bmp,.svg,.ico,.webp,.gif,.jfif,.png,.jpg,.jpeg';
/** 파일 고르기 버튼: <label> 안에 진짜 파일 입력을 넣어, 스크립트 없이 브라우저가 직접 '파일 열기' 창을 띄운다.
 *  (숨긴 input을 스크립트로 click() 하면 Safari·일부 앱 화면에서 막힌다) */
function filePicker({ cls = 'btn', label = '', title, multiple = true, onFiles }, ...kids) {
  const input = h('input', { type: 'file', class: 'fp-input', accept: ACCEPT, multiple: multiple || null, tabindex: '-1', 'aria-hidden': 'true',
    onchange: (e) => { const fs = imageFiles(e.target.files); const total = (e.target.files || []).length; e.target.value = ''; if (fs.length) onFiles(fs); if (total > fs.length) toast({ title: '사진이 아닌 파일은 빼고 넣었어요', ttl: 3000 }); } });
  const el = h('label', { class: cls + ' fp', title: title || label || null, role: 'button', tabindex: '0', 'aria-label': label || title || null,
    onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } } }, ...kids, input);
  return el;
}
function readFileURL(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('파일을 읽지 못했어요')); r.readAsDataURL(file); });
}
const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('decode')); im.src = src; });
// 브라우저가 바로 못 여는 형식(HEIC·TIFF)은 변환 도구를 필요할 때만 불러온다
const LIBS = {
  heic2any: { global: 'heic2any', path: '../node_modules/heic2any/dist/heic2any.min.js', cdn: 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js' },
  utif: { global: 'UTIF', path: '../node_modules/utif/UTIF.js', cdn: 'https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js' },
};
const libP = {};
function loadLib(name) {
  const L = LIBS[name];
  if (window[L.global]) return Promise.resolve(window[L.global]);
  if (!libP[name]) libP[name] = new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = api.libSrc ? api.libSrc(L) : L.path;
    sc.onload = () => (window[L.global] ? res(window[L.global]) : rej(new Error('변환 도구를 불러오지 못했어요')));
    sc.onerror = () => { libP[name] = null; rej(new Error('변환 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요')); };
    document.head.append(sc);
  });
  return libP[name];
}
const withTimeout = (pr, ms) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error('사진을 여는 데 시간이 너무 오래 걸려요')), ms))]);
async function decodeImage(file) {
  const kind = (file.type || '') + ' ' + (file.name || '');
  try { const src = await readFileURL(file); return { img: await loadImg(src), src }; }
  catch (e) { if (!/heic|heif|tiff?/i.test(kind)) throw e; }
  if (/heic|heif/i.test(kind)) {
    if (api.convertHeic) { // 데스크톱 앱: 메인 프로세스에서 변환
      const out = await api.convertHeic(await file.arrayBuffer());
      const src = await readFileURL(new Blob([out], { type: 'image/jpeg' }));
      return { img: await loadImg(src), src };
    }
    const heic2any = await loadLib('heic2any').catch(() => { throw new Error('이 브라우저에서는 HEIC 사진을 열 수 없어요. 데스크톱 앱이나 Safari에서 넣어주세요'); });
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
    const src = await readFileURL(Array.isArray(out) ? out[0] : out);
    return { img: await loadImg(src), src };
  }
  const UTIF = await loadLib('utif');
  const buf = await file.arrayBuffer(), ifds = UTIF.decode(buf); UTIF.decodeImage(buf, ifds[0]);
  const rgba = UTIF.toRGBA8(ifds[0]), c = document.createElement('canvas'); c.width = ifds[0].width; c.height = ifds[0].height;
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer), c.width, c.height), 0, 0);
  const src = c.toDataURL('image/png');
  return { img: await loadImg(src), src };
}
async function readPhoto(file, max = 1024) {
  if (!isImageFile(file)) throw new Error('사진 파일이 아니에요');
  if (file.size > 60 * 1024 * 1024) throw new Error('60MB보다 큰 사진은 넣을 수 없어요');
  let d;
  try { d = await withTimeout(decodeImage(file), 30000); }
  catch (e) { throw new Error(/변환 도구|HEIC|시간/.test(e && e.message) ? e.message : '이 사진은 열 수 없어요 (파일이 손상됐거나 이 컴퓨터가 지원하지 않는 형식)'); }
  const { img, src } = d;
  // 작은 PNG·GIF·WebP·SVG는 원본 그대로 둔다 (투명 배경, 움직이는 GIF 유지)
  if (/^data:image\/(png|gif|webp|svg\+xml)/.test(src) && src.length < 700000 && Math.max(img.width, img.height) <= 1600) return src;
  const k = Math.min(1, max / Math.max(img.width || max, img.height || max)), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round((img.width || max) * k)); c.height = Math.max(1, Math.round((img.height || max) * k));
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}
async function addPhotos(n, files) {
  let added = 0;
  for (const f of files) {
    if (n.photos.length >= MAX_PHOTOS) { toast({ title: `사진은 메모 하나에 ${MAX_PHOTOS}장까지 넣을 수 있어요`, ttl: 2600 }); break; }
    try { n.photos.push(await readPhoto(f)); added++; } catch (err) { toast({ title: '사진을 넣지 못했어요', body: `${f.name}: ${err.message}`, ttl: 5000 }); }
  }
  if (added) {
    n.viewedAt = Date.now(); save(); renderTabs();
    if (openId === n.id) { renderCard(n); perchSay(keys.anthropic ? `사진 ${added}장 넣었어요. 사진 속 일정도 읽어드릴게요!` : `사진 ${added}장 넣었어요.`, 3500); }
    else say(`'${n.keyword || '새 메모'}' 메모에 사진 ${added}장을 넣었어요.`, { ttl: 5000, actions: [{ label: '메모 보기', run: () => openNote(n.id) }] });
  }
  return added;
}
/** 캐릭터·책갈피·모아보기 메모에 사진 파일을 끌어다 놓기 */
function bindImageDrop(el, target, makeNew) {
  el.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); el.classList.add('dropping'); } });
  el.addEventListener('dragleave', () => el.classList.remove('dropping'));
  el.addEventListener('drop', async (e) => {
    el.classList.remove('dropping');
    const fs = imageFiles(e.dataTransfer?.files); if (!fs.length) return;
    e.preventDefault(); e.stopPropagation();
    if (modalKind === 'board') closeBoard();
    let n = target();
    if (!n) n = makeNew ? makeNew() : newNote(false);
    await addPhotos(n, fs);
    if (openId !== n.id) openNote(n.id);
  });
}

/* 사진 크게 보기 */
function openViewer(n, i) {
  closePeek(true); closeBubble();
  modalOpen = true; updateHit();
  const m = $('#modal'); m.hidden = false;
  const show = () => {
    if (!n.photos.length) { closeViewer(); return; }
    i = (i + n.photos.length) % n.photos.length;
    const src = n.photos[i];
    m.replaceChildren(h('div', { class: 'viewer', role: 'dialog', 'aria-label': '사진 보기' },
      h('img', { src: /^data:image\//.test(src) ? src : '', alt: `첨부 사진 ${i + 1}` }),
      h('div', { class: 'vbar' },
        n.photos.length > 1 ? h('button', { class: 'btn icon', type: 'button', 'aria-label': '이전 사진', onclick: () => { i--; show(); }, html: '<span style="display:inline-block;transform:scaleX(-1)">' + ico('fold', 16) + '</span>' }) : null,
        h('span', { class: 'vcount' }, `${i + 1} / ${n.photos.length}`),
        n.photos.length > 1 ? h('button', { class: 'btn icon', type: 'button', 'aria-label': '다음 사진', onclick: () => { i++; show(); }, html: ico('fold', 16) }) : null,
        h('span', { style: 'flex:1' }),
        h('button', { class: 'btn', type: 'button', onclick: () => { closeViewer(); photoToSticker(n, i); } }, iel('star', 15), '스티커로 붙이기'),
        h('button', { class: 'btn', type: 'button', onclick: () => { n.photos.splice(i, 1); save(); if (openId === n.id) renderCard(n); show(); } }, iel('trash', 15), '삭제'),
        h('button', { class: 'btn primary icon', type: 'button', 'aria-label': '닫기', onclick: closeViewer, html: ico('x', 16) }))));
  };
  m.onpointerdown = (e) => { if (e.target === m) closeViewer(); };
  viewerKeys = (e) => { if (e.key === 'ArrowLeft') { i--; show(); } else if (e.key === 'ArrowRight') { i++; show(); } };
  document.addEventListener('keydown', viewerKeys);
  show();
}
let viewerKeys = null;
function closeViewer() {
  if (viewerKeys) document.removeEventListener('keydown', viewerKeys); viewerKeys = null;
  modalOpen = false; const m = $('#modal'); m.hidden = true; m.replaceChildren(); m.onpointerdown = null; updateHit();
}
function photoToSticker(n, i) {
  const src = n.photos.splice(i, 1)[0];
  n.stickers.push({ id: uid(), type: 'photo', src, x: 290 + Math.random() * 30, y: 250 + Math.random() * 60, s: 1, rot: Math.round(Math.random() * 16 - 8) });
  selStk = n.stickers[n.stickers.length - 1].id; save(); renderCard(n);
}
function addSticker(n, type) {
  const st = { id: uid(), type, x: 210 + (Math.random() * 80 - 40), y: 330 + (Math.random() * 60 - 30), s: 1, rot: Math.round(Math.random() * 20 - 10) };
  n.stickers.push(st); selStk = st.id; save(); renderStickers(n);
}
const sizeOf = (st) => (st.type === 'photo' ? 132 * st.s : STK[st.type].w * st.s);
function renderStickers(n) {
  const layer = $('#stkLayer'); if (!layer) return; layer.replaceChildren();
  for (const st of n.stickers) {
    if (st.type !== 'photo' && !STK[st.type]) continue;
    const el = h('div', { class: 'stk' + (st.type === 'photo' ? ' photo' : '') + (st.id === selStk ? ' sel' : ''), 'data-id': st.id, role: 'img', 'aria-label': st.type === 'photo' ? '사진 스티커' : STK[st.type].n });
    if (st.type === 'photo') el.append(h('img', { src: /^data:image\//.test(st.src || '') ? st.src : '', alt: '' }));
    else el.innerHTML = stkSVG(st.type);
    place(el, st); bindDrag(el, n, st); layer.append(el);
  }
  const sel = n.stickers.find((s) => s.id === selStk);
  if (sel) {
    const el = layer.querySelector(`[data-id="${sel.id}"]`);
    const bar = h('div', { class: 'sbar', role: 'toolbar', 'aria-label': '스티커 편집' },
      h('button', { type: 'button', 'aria-label': '작게', onclick: () => { sel.s = clamp(sel.s * 0.85, 0.4, 3); afterEdit(n); }, html: ico('minus', 15) }),
      h('button', { type: 'button', 'aria-label': '크게', onclick: () => { sel.s = clamp(sel.s * 1.18, 0.4, 3); afterEdit(n); }, html: ico('plus', 15) }),
      h('button', { type: 'button', 'aria-label': '돌리기', onclick: () => { sel.rot = (sel.rot + 15) % 360; afterEdit(n); }, html: ico('rotate', 15) }),
      h('button', { type: 'button', 'aria-label': '스티커 떼기', onclick: () => { n.stickers = n.stickers.filter((x) => x !== sel); selStk = null; save(); renderStickers(n); }, html: ico('trash', 15) }));
    layer.append(bar); placeBar(bar, sel, el);
  }
}
function afterEdit(n) { save(); renderStickers(n); }
function place(el, st) { el.style.width = sizeOf(st) + 'px'; el.style.left = st.x + 'px'; el.style.top = st.y + 'px'; el.style.transform = `translate(-50%,-50%) rotate(${st.rot}deg)`; }
function placeBar(bar, st, el) { const hh = el ? el.offsetHeight : 40; bar.style.left = clamp(st.x - 60, 4, 420 - 124) + 'px'; bar.style.top = clamp(st.y - hh / 2 - 48, 2, 520) + 'px'; }
function bindDrag(el, n, st) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const was = selStk === st.id; selStk = st.id;
    const card = el.closest('.card'), sc = card.getBoundingClientRect().width / 420;
    const sx = e.clientX, sy = e.clientY, ox = st.x, oy = st.y; let moved = false;
    el.setPointerCapture(e.pointerId); dragging = true;
    document.querySelectorAll('.stk.sel').forEach((x) => x.classList.remove('sel')); el.classList.add('sel');
    const mv = (ev) => { moved = true; st.x = clamp(ox + (ev.clientX - sx) / sc, -10, 430); st.y = clamp(oy + (ev.clientY - sy) / sc, -10, 570); place(el, st); const b = card.querySelector('.sbar'); if (b) placeBar(b, st, el); };
    const up = () => { dragging = false; el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); save(); if (!was || !moved) renderStickers(n); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
}

/* ─────────── 일정 · 알람 ─────────── */
function mkEvent(ev) {
  const st = (S && S.settings) || DEFAULTS;
  const pre = ev.allDay ? 0 : ev.deadline ? +st.preDeadline : +st.preNormal;
  return { id: uid(), title: ev.title, at: ev.at, repeat: ev.repeat || 'none', alarm: true, done: false, fired: false, deadline: !!ev.deadline, allDay: !!ev.allDay, pre: pre || 0, preFired: false };
}
function addEvent(n, ev) {
  if (n.events.some((e) => Math.abs(e.at - ev.at) < 60000 && e.title === ev.title)) return null;
  const e = mkEvent(ev); n.events.push(e); n.events.sort((a, b) => a.at - b.at); return e;
}
function candidates(n) {
  return P.parseEvents([n.title, n.text].filter(Boolean).join('\n')).filter((c) => !n.events.some((e) => Math.abs(e.at - c.at) < 60000));
}
function chime() {
  try {
    const ac = new AudioContext(), t = ac.currentTime;
    [880, 1175, 1568].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(), s = t + i * 0.16;
      o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.12, s + 0.02); g.gain.exponentialRampToValueAtTime(0.001, s + 0.6);
      o.connect(g); g.connect(ac.destination); o.start(s); o.stop(s + 0.65); });
  } catch {}
}
function toast({ title, body, theme, actions = [], ttl = 0 }) {
  const box = $('#toasts'), t = TH(theme || 'cherry').tab;
  const el = h('div', { class: 'toast', role: 'status' },
    h('div', { class: 'bi', style: `background:${t.bg};color:${t.ink}`, html: ico('bell', 20) }),
    h('div', { style: 'flex:1;min-width:0' },
      h('div', { class: 'tt' }, title), body ? h('div', { class: 'tb2' }, body) : null,
      actions.length ? h('div', { class: 'ta' }, actions.map((a) => h('button', { class: 'btn' + (a.primary ? ' primary' : ''), type: 'button', onclick: () => { el.remove(); updateHit(); a.run && a.run(); } }, a.label))) : null));
  box.append(el);
  if (ttl) setTimeout(() => { el.remove(); updateHit(); }, ttl);
  return el;
}
function remind(n, e, pre) {
  const when = new Date(e.at);
  const title = pre ? `${pre}분 뒤 ${e.deadline ? '마감' : '일정'} · ${e.title}` : `${e.deadline ? '마감 시간이에요' : '지금이에요'} · ${e.title}`;
  const body = `${fmtDate(when)} ${fmtTime(when)} · '${n.keyword || '메모'}' 메모`;
  api.notify({ title, body, noteId: n.id });
  n.ring = true; chime(); setMood('alert', 6000);
  say(pre ? `${e.title}, ${pre}분 남았어요! 준비됐나요?` : `${e.title} 시간이에요!`, { ttl: 9000 });
  const info = { title: e.title, repeat: e.repeat };
  toast({ title, body, theme: n.theme, actions: [
    { label: '메모 열기', primary: true, run: () => openNote(n.id) },
    { label: '10분 뒤 다시', run: () => { n.ring = false; if (info.repeat === 'none' && !pre) { e.at = Date.now() + 600000; e.fired = false; } else addEvent(n, { title: info.title, at: Date.now() + 600000 }); save(); renderTabs(); refreshAgenda(); } },
    { label: '확인', run: () => { n.ring = false; save(); renderTabs(); } },
  ] });
}
function fire(n, e) {
  e.fired = true;
  remind(n, e, 0);
  if (e.repeat && e.repeat !== 'none') {
    const step = e.repeat === 'daily' ? DAYMS : 7 * DAYMS; let nat = e.at + step; while (nat <= Date.now()) nat += step;
    e.at = nat; e.fired = false; e.preFired = false;
  }
}
function tick() {
  const now = Date.now(); let dirty = false;
  for (const n of S.notes) for (const e of n.events) {
    if (!e.alarm || e.done || e.fired) continue;
    if (e.pre > 0 && !e.preFired && now >= e.at - e.pre * 60000 && now < e.at - 30000) { e.preFired = true; remind(n, e, e.pre); dirty = true; continue; }
    if (e.at > now) continue;
    if (now - e.at > 6 * 3600000) { e.fired = true; e.missed = true; dirty = true; continue; }
    fire(n, e); dirty = true;
  }
  morningBrief();
  if (dirty) { save(); renderTabs(); refreshAgenda(); }
}
function morningBrief() {
  if (!S.settings.morningBrief) return;
  const d = new Date(), key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  if (S.lastBrief === key || d.getHours() < 7) return;
  S.lastBrief = key; save();
  setTimeout(async () => {
    let w = ''; if (api.weather) { const t = await weatherReply('오늘 날씨').catch(() => ''); if (/°C/.test(t)) w = ' ' + t; }
    say(`좋은 아침이에요! ${briefing()}${w}`, { ttl: 14000 }); setMood('talk', 3000);
  }, 1200);
  if (todayEvents().length) api.notify({ title: `${C.charName(S)}의 오늘 브리핑`, body: briefing() });
}
function todayEvents() {
  const t0 = startOfDay(new Date()).getTime(), all = [];
  S.notes.forEach((n) => n.events.forEach((e) => all.push({ n, e })));
  return all.filter((x) => !x.e.done && x.e.at >= t0 && x.e.at < t0 + DAYMS).sort((a, b) => a.e.at - b.e.at);
}
function briefing() {
  const now = Date.now(), all = [];
  S.notes.forEach((n) => n.events.forEach((e) => all.push({ n, e })));
  const today = todayEvents();
  const nx = all.filter((x) => !x.e.done && x.e.alarm && x.e.at > now).sort((a, b) => a.e.at - b.e.at)[0];
  const a = today.length ? `오늘 일정은 ${today.length}개예요. ${today.slice(0, 3).map((x) => `${fmtTime(new Date(x.e.at))} ${x.e.title}${x.e.deadline ? '(마감)' : ''}`).join(', ')}${today.length > 3 ? ' 외' : ''}.` : '오늘 남은 일정이 없어요.';
  const b = nx ? ` 다음 알람은 ${fmtIn(nx.e.at - now)}, '${nx.e.title}'이에요.` : '';
  return a + b;
}

/* ─────────── AI 비서 ─────────── */
function normalizeAI(j, text) {
  const keyword = String(j.keyword || '').trim().slice(0, 8);
  const events = [];
  for (const e of Array.isArray(j.events) ? j.events : []) {
    const at = new Date(String(e.when || '')).getTime(); // "YYYY-MM-DDTHH:mm" → 현지 시각
    if (!isFinite(at) || at < Date.now() - 60000) continue;
    events.push({ title: String(e.title || '일정').trim().slice(0, 26) || '일정', at, repeat: ['daily', 'weekly'].includes(e.repeat) ? e.repeat : 'none', deadline: !!e.deadline, allDay: !!e.all_day });
  }
  return {
    keyword: keyword || P.guessKeyword(text, ''), title: String(j.title || '').slice(0, 40), body: String(j.body || '').trim() || text,
    summary: (Array.isArray(j.summary) ? j.summary : []).map((s) => String(s).trim().slice(0, 40)).filter(Boolean).slice(0, 3),
    events, reply: String(j.reply || '').trim(), section: String(j.section || '').trim(), src: 'claude',
  };
}
function localResult(text, title, kind) {
  const a = P.localAnalyze(text, title);
  return { keyword: a.keyword, title: '', body: kind === 'transcript' ? P.tidyTranscript(text) : text, summary: a.summary, events: a.events, reply: '', section: '', src: 'local' };
}
async function aiOrganize(text, title, kind, images = []) {
  if (keys.anthropic) {
    const r = await api.organize({ text, title, kind, sections: S.sections.map((x) => x.name), images: images.filter((d) => /^data:image\/(jpeg|png|gif|webp);base64,/.test(d)).slice(0, 4) });
    if (r.ok) { try { return normalizeAI(r.result, text); } catch {} }
    else if (r.reason === 'error') toast({ title: 'AI 정리 대신 기본 규칙으로 정리했어요', body: r.error, ttl: 4500 });
  }
  return localResult(text, title, kind);
}
function replyFor(r, added) {
  if (r.reply) return r.reply;
  if (!added.length) return `'${r.keyword}'(으)로 정리해 뒀어요.`;
  const e = added[0], d = new Date(e.at);
  let s = `${fmtDate(d)} ${e.allDay ? '' : fmtTime(d) + ' '}'${e.title}' 알람을 맞췄어요!`;
  if (e.pre) s += ` ${e.pre >= 60 ? e.pre / 60 + '시간' : e.pre + '분'} 전에도 한 번 더 알려드릴게요.`;
  if (added.length > 1) s += ` (일정 ${added.length}개)`;
  return s;
}
function applyResult(n, r) {
  if (!n.kwManual || !n.keyword.trim()) { n.keyword = r.keyword; n.kwManual = false; }
  if (!n.title.trim() && r.title) n.title = r.title;
  if (r.summary.length) n.summary = r.summary;
  n.aiSource = r.src;
  if (!n.secManual && !secIdOf(n)) { const x = S.sections.find((y) => y.name === r.section); n.sectionId = x ? x.id : guessSection(n); }
  const added = []; for (const ev of r.events) { const e = addEvent(n, ev); if (e) added.push(e); }
  return added;
}
let organizing = new Set();
async function organizeNote(n, { auto }) {
  const text = n.text.trim();
  const usePhotos = keys.anthropic && n.photos.length > 0;
  if (!text && !usePhotos) { if (!auto) perchSay(n.photos.length ? '사진 속 글은 AI 연결(Claude 키)이 있어야 읽을 수 있어요.' : '메모를 먼저 적어주세요!', 4500); return; }
  if (organizing.has(n.id)) return;
  organizing.add(n.id); setMood('think');
  const btn = !auto && $('#aiBtn'); if (btn) { btn.disabled = true; btn.replaceChildren(iel('sparkle', 16), '정리하는 중…'); }
  try {
    const r = await aiOrganize(text || '(글 없이 사진만 있는 메모)', n.title, 'memo', usePhotos ? n.photos : []);
    if (!byId(n.id)) return;
    const added = applyResult(n, r);
    n.orgHash = noteHash(n);
    save();
    if (openId === n.id) renderCard(n);
    renderTabs(); refreshAgenda();
    const msg = replyFor(r, added);
    setMood('talk', 2500);
    if (openId === n.id) perchSay(msg, 5000);
    else if (auto && added.length) say(msg, { ttl: 7000 });
    else if (!auto) say(msg, { ttl: 6000 });
  } finally { organizing.delete(n.id); if (mood === 'think') setMood('idle'); }
}
/** 비서에게 부탁: 글이나 말로 한 부탁을 새 메모로 만들고 알람까지 맞춘다. */
const WMO = (c) => (c === 0 ? '맑음' : c <= 2 ? '구름 조금' : c === 3 ? '흐림' : c <= 48 ? '안개' : c <= 57 ? '이슬비' : c <= 67 ? '비' : c <= 77 ? '눈' : c <= 82 ? '소나기' : c <= 86 ? '눈 소나기' : '천둥번개');
const josa = (w, a, b) => { const ch = String(w).charCodeAt(String(w).length - 1); return w + ((ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28) ? a : b); };
const isWeatherAsk = (t) => /(날씨|기온|몇\s*도|우산|비\s*(와|오|올|내)|눈\s*(와|오|올|내)|더워|추워|덥나|춥나|미세먼지)/.test(t) && !/(까지|알람|메모해|적어)/.test(t);
async function weatherReply(text = '') {
  let city = (S.settings.weatherCity || '서울').trim();
  const m = text.match(/([가-힣A-Za-z]{2,12})\s*(?:의\s*)?(?:날씨|기온)/);
  if (m && !/^(오늘|내일|지금|요즘|이번주|주말|모레|현재|우리|여기)$/.test(m[1])) city = m[1];
  if (!api.weather) return '날씨는 데스크톱 앱에서 알려드릴 수 있어요.';
  const r = await api.weather(city).catch(() => ({ ok: false }));
  if (!r || !r.ok) return (r && r.error) || '날씨를 가져오지 못했어요. 잠시 뒤에 다시 물어봐 주세요.';
  const tm = /내일/.test(text), d = tm ? r.tomorrow : r.today, rd = (v) => Math.round(v);
  let msg = tm ? `${r.place} 내일은 ${WMO(d.code)}, ${rd(d.min)}~${rd(d.max)}°C예요.` : `${josa(r.place, '은', '는')} 지금 ${rd(r.now.temp)}°C, ${WMO(r.now.code)}이에요. 오늘은 ${rd(d.min)}~${rd(d.max)}°C`;
  if (!tm) msg += d.pop != null ? `, 비 올 확률 ${d.pop}%예요.` : '예요.';
  else if (d.pop != null) msg += ` 비 올 확률은 ${d.pop}%.`;
  if (d.pop >= 50) msg += ' 우산 꼭 챙기세요!'; else if (d.max <= 3) msg += ' 많이 추워요. 따뜻하게 입으세요.'; else if (d.max >= 30) msg += ' 더우니 물 자주 마셔요.';
  return msg;
}
async function askWeather(text) {
  setMood('think'); say('날씨를 알아볼게요…', { menu: false, ttl: 0 });
  const msg = await weatherReply(text);
  setMood('talk', 2500); say(msg, { ttl: 12000 });
}
async function askAssistant(text) {
  text = text.trim(); if (!text) return;
  if (isWeatherAsk(text)) return askWeather(text);
  setMood('think'); say('정리하고 있어요…', { menu: false, ttl: 0 });
  const r = await aiOrganize(text, '', 'command');
  const n = blankNote();
  n.text = r.body || text; n.title = r.title || '';
  const added = applyResult(n, r);
  if (!n.summary.length) n.summary = P.summarize(n.text);
  n.orgHash = noteHash(n);
  S.notes.unshift(n); save(); renderTabs(); refreshAgenda();
  setMood('talk', 3000);
  say(replyFor(r, added), { ttl: 9000, actions: [{ label: '메모 보기', run: () => openNote(n.id) }] });
}

/* ─────────── 녹음 ─────────── */
function recBar() {
  const el = h('div', { class: 'recbar', id: 'recbar' },
    h('span', { class: 'dot' }), h('span', { id: 'recTime' }, '0:00'),
    rec && rec.dict ? h('span', { id: 'recLive', class: 'live' }, '듣고 있어요…') : null,
    h('span', { class: 'lvl' }, h('i', { id: 'recLvl' })),
    h('button', { class: 'btn', type: 'button', onclick: stopRecording }, iel('stop', 13), '정지·정리'));
  return el;
}
async function startRecording(n, kind) {
  if (rec) { toast({ title: '이미 녹음 중이에요', ttl: 2000 }); return; }
  const dict = api.dictation ? api.dictation() : null;
  if (dict) { startDictation(dict, n, kind); return; }
  if (!S.settings.consentShown) {
    S.settings.consentShown = true; save();
    toast({ title: '녹음 전에 확인해 주세요', body: '회의를 녹음할 때는 참석자에게 먼저 알리고 동의를 받아주세요. 받아쓰기는 녹음 길이만큼 비용이 들어요.', ttl: 8000 });
  }
  try {
    await api.askMic();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks = [];
    mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const ac = new AudioContext(), src = ac.createMediaStreamSource(stream), an = ac.createAnalyser();
    an.fftSize = 512; src.connect(an);
    const data = new Uint8Array(an.fftSize);
    rec = { noteId: n ? n.id : null, kind, mr, stream, chunks, ac, t0: Date.now(), mime: mr.mimeType || mime || 'audio/webm' };
    rec.timer = setInterval(() => {
      const s = (Date.now() - rec.t0) / 1000;
      const t = $('#recTime'); if (t) t.textContent = fmtDur(s);
      an.getByteTimeDomainData(data); let pk = 0; for (const v of data) pk = Math.max(pk, Math.abs(v - 128));
      const l = $('#recLvl'); if (l) l.style.width = Math.min(100, pk / 1.1) + '%';
      if (s > 15 * 60) stopRecording(); // 최대 15분
    }, 100);
    mr.start(1000);
    setMood('listen'); renderPet();
    if (n && openId === n.id) renderCard(n);
    if (kind === 'command') say('듣고 있어요. 다 말하면 저를 한 번 더 눌러주세요.', { ttl: 0, menu: false });
  } catch (e) {
    rec = null; setMood('idle');
    toast({ title: '마이크를 쓸 수 없어요', body: '시스템 설정에서 Mikang Memo의 마이크 권한을 켜주세요.', ttl: 5000 });
  }
}
/** 말하는 즉시 글로 바뀌는 받아쓰기 (웹 미리보기의 dictation) */
function startDictation(d, n, kind) {
  let finalText = '', partial = '';
  const r = { noteId: n ? n.id : null, kind, dict: d, t0: Date.now(), offs: [], done: false };
  r.text = () => (finalText + ' ' + partial).trim();
  const showLive = () => {
    const l = $('#recLive'); if (l) l.textContent = r.text().slice(-70) || '듣고 있어요…';
    if (kind === 'command' && bubble.open) { const m = $('#bubble .msg'); if (m) m.textContent = r.text() || '듣고 있어요. 다 말하면 저를 한 번 더 눌러주세요.'; }
  };
  r.offs.push(d.onPartial(({ text }) => { partial = text || ''; showLive(); }));
  r.offs.push(d.onFinal(({ text }) => { if (text) finalText += (finalText ? ' ' : '') + text; partial = ''; showLive(); }));
  r.offs.push(d.onState(({ state, reason }) => { if (state === 'idle' && !r.done) finishDictation(r, reason); }));
  rec = r;
  d.start().catch((e) => {
    if (r.done) return; r.done = true; r.offs.forEach((f) => f()); if (rec === r) rec = null; setMood('idle'); renderPet();
    const n0 = r.noteId && byId(r.noteId); if (n0 && openId === n0.id) renderCard(n0);
    toast({ title: '받아쓰기를 시작하지 못했어요', body: e && e.code === 'not_granted' ? '마이크나 받아쓰기 권한이 꺼져 있어요.' : '이 브라우저에서는 받아쓰기를 쓸 수 없어요. Chrome에서 열어주세요.', ttl: 5000 });
  });
  r.timer = setInterval(() => {
    const t = $('#recTime'); if (t) t.textContent = fmtDur((Date.now() - r.t0) / 1000);
    const l = $('#recLvl'); if (l) l.style.width = (30 + 30 * Math.sin(Date.now() / 180)) + '%';
  }, 100);
  setMood('listen'); renderPet();
  if (n && openId === n.id) renderCard(n);
  if (kind === 'command') say('듣고 있어요. 다 말하면 저를 한 번 더 눌러주세요.', { ttl: 0, menu: false });
}
async function finishDictation(r, reason) {
  if (r.done) return; r.done = true;
  clearInterval(r.timer); r.offs.forEach((f) => f());
  if (rec === r) rec = null;
  renderPet();
  const text = r.text();
  const n = r.noteId && byId(r.noteId);
  if (!text) {
    setMood('idle'); if (n && openId === n.id) renderCard(n);
    if (r.kind === 'command') closeBubble();
    toast({ title: reason === 'not_granted' ? '받아쓰기 권한이 꺼져 있어요' : '말소리를 듣지 못했어요', ttl: 3500 });
    return;
  }
  setMood('think');
  if (r.kind === 'command') { await askAssistant(text); return; }
  if (n) await applyTranscript(n, text, r.t0);
}
function stopRecording() {
  if (!rec) return;
  if (rec.dict) { const r = rec; r.dict.stop().catch(() => {}).finally(() => finishDictation(r, 'stopped')); return; }
  const r = rec; rec = null;
  clearInterval(r.timer);
  r.mr.onstop = async () => {
    r.stream.getTracks().forEach((t) => t.stop()); try { r.ac.close(); } catch {}
    const blob = new Blob(r.chunks, { type: r.mime });
    const dur = (Date.now() - r.t0) / 1000;
    renderPet();
    if (dur < 1 || !blob.size) { setMood('idle'); const n0 = r.noteId && byId(r.noteId); if (n0 && openId === n0.id) renderCard(n0); return; }
    setMood('think');
    const ext = /mp4/.test(r.mime) ? 'm4a' : 'webm';
    const aud = { id: uid(), at: r.t0, dur, mime: r.mime.split(';')[0], transcript: '' };
    await api.saveAudio(aud.id, await blob.arrayBuffer(), ext);
    if (r.kind === 'command') { await handleVoiceCommand(aud); return; }
    const n = byId(r.noteId);
    if (!n) return;
    n.audios.push(aud); save();
    if (openId === n.id) renderCard(n);
    await processRecording(n, aud);
  };
  r.mr.stop();
}
async function transcribeAudio(aud) {
  if (!keys.openai) {
    toast({ title: '받아쓰기를 하려면 OpenAI API 키가 필요해요', body: '설정 → AI 연결에서 키를 넣으면 녹음이 자동으로 글로 바뀌어요. 녹음 파일은 메모에 붙여뒀어요.', ttl: 7000, actions: [{ label: '설정 열기', run: openSettings }] });
    return '';
  }
  const t = await api.transcribe(aud.id);
  if (!t.ok) { toast({ title: '받아쓰기에 실패했어요', body: t.error, ttl: 5000 }); return ''; }
  if (!t.text) toast({ title: '녹음에서 말소리를 찾지 못했어요', ttl: 3000 });
  return t.text;
}
async function processRecording(n, aud) {
  try {
    const text = await transcribeAudio(aud);
    if (!text) return;
    aud.transcript = text;
    await applyTranscript(n, text, aud.at);
  } finally { if (mood === 'think') setMood('idle'); }
}
async function applyTranscript(n, text, at) {
  try {
    const r = await aiOrganize(text, n.title, 'transcript');
    const d = new Date(at);
    const head = `[녹음 정리 · ${d.getMonth() + 1}/${d.getDate()} ${fmtTime(d)}]`;
    n.text = (n.text.trim() ? n.text.trimEnd() + '\n\n' : '') + head + '\n' + r.body;
    const added = applyResult(n, r);
    n.orgHash = noteHash(n);
    save(); renderTabs(); refreshAgenda();
    if (openId === n.id) { renderCard(n); perchSay(replyFor(r, added), 6000); }
    else say(`'${n.keyword}' 메모에 녹음을 정리해 뒀어요. ${added.length ? replyFor(r, added) : ''}`, { ttl: 8000, actions: [{ label: '메모 보기', run: () => openNote(n.id) }] });
    setMood('talk', 2500);
  } finally { if (mood === 'think') setMood('idle'); }
}
async function handleVoiceCommand(aud) {
  const text = await transcribeAudio(aud);
  api.deleteAudio(aud.id);
  if (!text) { setMood('idle'); closeBubble(); return; }
  await askAssistant(text);
}
function quickRecord() {
  if (rec) { stopRecording(); return; }
  const n = openId ? byId(openId) : newNote(false);
  startRecording(n, 'note');
}

/* ─────────── 캐릭터(펫) ─────────── */
let petChar = '';
function setMood(m, ttl = 0) {
  clearTimeout(moodT);
  mood = rec && m === 'idle' ? 'listen' : m;
  const pet = $('#pet'); pet.classList.remove('mood-idle', 'mood-talk', 'mood-alert', 'mood-think', 'mood-listen'); pet.classList.add('mood-' + mood);
  const pr = $('#perch'); if (pr) { pr.className = pr.className.replace(/mood-\w+/, 'mood-' + mood); }
  if (ttl) moodT = setTimeout(() => setMood('idle'), ttl);
}
function renderPet() {
  const pet = $('#pet');
  const sig = S.settings.character + '|' + (S.settings.character === 'custom' ? S.settings.customChar.length : '');
  if (sig !== petChar) {
    petChar = sig;
    pet.innerHTML = C.charHTML(S.settings.character, S.settings.customChar) + '<span class="rec-badge">● 녹음</span><span class="count" hidden></span>'
      + `<span class="talk" role="button" aria-label="비서와 이야기하기" title="비서와 이야기하기 (날씨·부탁·녹음)">${ico('chat', 15)}</span>`;
  }
  pet.classList.toggle('recording', !!rec);
  pet.setAttribute('aria-label', C.charName(S) + ' (AI 비서)');
  renderPetBadges();
  setMood(mood);
}
function renderPetBadges() {
  const c = $('#pet .count'); if (!c) return;
  const n = upcomingCount();
  c.hidden = !n || !petMode(); c.textContent = n;
}
function petXY() {
  const p = S.settings.petPos, size = 92;
  if (p) return { x: clamp(p.x * W(), 0, W() - size), y: clamp(p.y * H(), 0, H() - size) };
  return { x: S.settings.side === 'left' ? 18 : W() - size - 18, y: H() - size - 28 };
}
function placePet() {
  const pet = $('#pet'), { x, y } = petXY();
  pet.style.left = x + 'px'; pet.style.top = y + 'px';
  if (bubble.open) placeBubble();
}
function bindPet() {
  const pet = $('#pet');
  pet.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, o = petXY(); let moved = false; const onTalk = !!e.target.closest('.talk');
    pet.setPointerCapture(e.pointerId); dragging = true;
    const mv = (ev) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
      moved = true;
      const x = clamp(o.x + ev.clientX - sx, 0, W() - 92), y = clamp(o.y + ev.clientY - sy, 0, H() - 92);
      pet.style.left = x + 'px'; pet.style.top = y + 'px';
      S.settings.petPos = { x: x / W(), y: y / H() };
      if (bubble.open) placeBubble();
    };
    const up = () => {
      dragging = false;
      pet.removeEventListener('pointermove', mv); pet.removeEventListener('pointerup', up); pet.removeEventListener('pointercancel', up);
      if (moved) save(); else if (onTalk) toggleMenu(); else onPetClick();
    };
    pet.addEventListener('pointermove', mv); pet.addEventListener('pointerup', up); pet.addEventListener('pointercancel', up);
  });
  pet.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPetClick(); } });
  pet.addEventListener('contextmenu', (e) => { e.preventDefault(); toggleMenu(); });
  bindImageDrop(pet, () => (openId ? byId(openId) : null));
}
/** 캐릭터를 누르면 책갈피가 펼쳐지고, 한 번 더 누르면 접힌다. */
function onPetClick() {
  if (rec && rec.kind === 'command') { stopRecording(); return; }
  const shown = !$('#stage').classList.contains('dock-hidden');
  if (shown) {
    if (openId || agendaOpen || bubble.open) closeAll();
    summoned = false; dockFolded = !petMode();
  } else { dockFolded = false; summoned = petMode(); }
  applyMode(); renderTabs(); setMood('talk', 700);
}
function toggleMenu() { if (bubble.open && bubble.menu) closeBubble(); else { openMenu(); api.focus(); } }

/* 말풍선 */
function placeBubble() {
  const b = $('#bubble'), p = petXY(), bw = 300, bh = b.offsetHeight || 160;
  let x = p.x + 46 - bw / 2; x = clamp(x, 8, W() - bw - 8);
  if (S.settings.side === 'right' && p.x > W() - 240) x = clamp(p.x - bw + 70, 8, W() - bw - 8);
  let y = p.y - bh - 12; if (y < 8) y = p.y + 100;
  b.style.left = x + 'px'; b.style.top = y + 'px';
}
function say(msg, { ttl = 6000, menu, actions = [] } = {}) {
  const b = $('#bubble');
  const keepMenu = menu ?? (bubble.open && bubble.menu);
  bubble = { open: true, menu: keepMenu, t: bubble.t };
  b.replaceChildren(h('div', { class: 'who' }, C.charName(S)), h('div', { class: 'msg' }, msg));
  if (actions.length) b.append(h('div', { class: 'ask' }, actions.map((a) => h('button', { class: 'btn primary', type: 'button', onclick: () => { closeBubble(); a.run(); } }, a.label))));
  if (keepMenu) appendMenu(b);
  b.hidden = false; placeBubble(); updateHit();
  clearTimeout(bubble.t);
  if (ttl && !keepMenu) bubble.t = setTimeout(closeBubble, ttl);
}
function greeting() {
  const hr = new Date().getHours();
  const hi = hr < 11 ? '좋은 아침이에요!' : hr < 17 ? '무엇을 도와드릴까요?' : '오늘 하루 수고 많았어요!';
  return `${hi} ${briefing()}`;
}
function openMenu() { say(greeting(), { menu: true, ttl: 0 }); setTimeout(() => { const i = $('#askIn'); i && i.focus(); }, 60); }
function appendMenu(b) {
  const input = h('input', { id: 'askIn', type: 'text', placeholder: '비서에게 부탁하기…', 'aria-label': '비서에게 부탁하기',
    onkeydown: (e) => { if (e.key === 'Enter' && !e.isComposing && input.value.trim()) { askAssistant(input.value); input.value = ''; } } });
  b.append(
    h('div', { class: 'acts' },
      h('button', { type: 'button', onclick: () => { closeBubble(); newNote(); } }, iel('edit', 18), '새 메모'),
      h('button', { type: 'button', onclick: () => { closeBubble(); quickRecord(); } }, iel('mic', 18), rec ? '녹음 정지' : '녹음 메모'),
      h('button', { type: 'button', onclick: () => { closeBubble(); toggleAgenda(); } }, iel('cal', 18), '일정'),
      h('button', { type: 'button', onclick: () => askWeather('오늘 날씨') }, iel('sun', 18), '날씨'),
      h('button', { type: 'button', onclick: () => { closeBubble(); openBoard(); } }, iel('board', 18), '모아보기'),
      h('button', { type: 'button', onclick: () => { closeBubble(); openSettings(); } }, iel('gear', 18), '설정')),
    h('div', { class: 'ask' }, input,
      h('button', { class: 'btn icon', type: 'button', title: '말로 부탁하기', 'aria-label': '말로 부탁하기', onclick: () => startRecording(null, 'command'), html: ico('mic', 16) }),
      h('button', { class: 'btn primary icon', type: 'button', 'aria-label': '보내기', onclick: () => { if (input.value.trim()) { askAssistant(input.value); input.value = ''; } }, html: ico('send', 16) })),
    h('div', { class: 'ex' }, '예) 내일 12시까지 회의자료 제출 · 오늘 날씨 어때? · 부산 내일 날씨'));
}
function closeBubble() { clearTimeout(bubble.t); bubble = { open: false, menu: false, t: 0 }; $('#bubble').hidden = true; updateHit(); }

/* ─────────── 가장자리 미리보기 ─────────── */
let edgeT = 0, edgeSide = null;
function recentNotes() { return S.notes.filter((n) => !isEmpty(n)).sort((a, b) => (b.viewedAt || b.createdAt) - (a.viewedAt || a.createdAt)).slice(0, 5); }
function handleEdge(c) {
  if (!S.settings.peek || openId || agendaOpen || modalOpen || (bubble.open && bubble.menu) || dragging) { clearTimeout(edgeT); edgeSide = null; return; }
  if (c.edge && !peek.open) {
    const el = document.elementFromPoint(c.edge === 'left' ? 1 : W() - 2, c.y);
    if (el && el.closest('.tab,.pet,.sheet')) return;
    if (edgeSide !== c.edge) {
      edgeSide = c.edge; clearTimeout(edgeT);
      edgeT = setTimeout(() => { if (cursor.edge === edgeSide) openPeek(edgeSide, cursor.y); }, +S.settings.peekDelay || 350);
    }
  } else if (!c.edge) { edgeSide = null; clearTimeout(edgeT); }
}
function openPeek(side, y) {
  peek.list = recentNotes(); peek.idx = 0; peek.side = side; peek.open = true;
  const el = $('#peek');
  el.className = 'peek ' + side;
  el.style.top = clamp(y - 150, 50, H() - 380) + 'px';
  renderPeek();
  requestAnimationFrame(() => { el.classList.add('open'); updateHit(); });
}
function renderPeek() {
  const el = $('#peek'), n = peek.list[peek.idx];
  const charBox = h('div', { class: 'pc', html: C.charHTML(S.settings.character, S.settings.customChar) });
  if (!n) {
    el.replaceChildren(h('div', { class: 'pcard' }, charBox, h('div', { class: 'pk' }, '메모가 없어요'), h('div', { class: 'pt' }, '저를 눌러서 첫 메모를 적어보세요.')));
    return;
  }
  const t = TH(n.theme), nx = nextEvent(n);
  const body = n.text.split('\n').filter(Boolean).slice(0, 6).join('\n');
  el.replaceChildren(h('div', { class: 'pcard', style: `--pf:${t.fill};--ps:${t.stroke};--ph:${t.hl};--pr:${t.rule}`, onclick: () => openNote(n.id), title: '눌러서 메모 열기' },
    charBox,
    h('div', { class: 'psec', style: `--tc:${secColor(secOf(n)).bg};--ti:${secColor(secOf(n)).ink}` }, secOf(n).name),
    h('div', { class: 'pk' }, n.keyword || '메모'),
    h('div', { class: 'pt' }, body || '(내용 없음)'),
    n.photos.length ? h('div', { class: 'pph' }, n.photos.slice(0, 3).map((src) => h('img', { src: /^data:image\//.test(src) ? src : '', alt: '' }))) : null,
    nx ? h('div', { class: 'pe' }, h('span', { class: 'chip' }, iel('bell', 12), `${fmtWhen(nx.at)} ${nx.title}`)) : null,
    h('div', { class: 'pf' }, h('span', {}, peek.list.length > 1 ? '휠로 넘겨보기 · 눌러서 열기' : '눌러서 열기'),
      h('span', { class: 'dots' }, peek.list.map((_, i) => h('i', { class: i === peek.idx ? 'on' : '' }))))));
  el.querySelector('.pc').classList.add('mood-' + (mood === 'listen' ? 'listen' : 'idle'));
}
function closePeek(now) {
  clearTimeout(peek.hideT); peek.hideT = 0;
  if (!peek.open) return;
  const go = () => { peek.hideT = 0; peek.open = false; $('#peek').classList.remove('open'); updateHit(); };
  if (now) go(); else peek.hideT = setTimeout(go, 220);
}
// 마우스가 메모 미리보기와 가장자리를 벗어나면 다시 사라진다
function handlePeekLeave(c) {
  if (!peek.open) return;
  const r = $('#peek .pcard')?.getBoundingClientRect(); if (!r) return;
  const m = 26, inside = c.x >= r.left - m && c.x <= r.right + m && c.y >= r.top - 60 && c.y <= r.bottom + m;
  if (inside || c.edge === peek.side) { clearTimeout(peek.hideT); peek.hideT = 0; }
  else if (!peek.hideT) closePeek(false);
}
$('#peek').addEventListener('wheel', (e) => { if (peek.list.length < 2) return; e.preventDefault(); peek.idx = (peek.idx + (e.deltaY > 0 ? 1 : -1) + peek.list.length) % peek.list.length; renderPeek(); }, { passive: false });

/* ─────────── 일정 정리 화면 ─────────── */
function refreshAgenda() { if (agendaOpen) renderAgenda(); }
function renderAgenda() {
  const root = $('#agenda');
  const all = []; S.notes.forEach((n) => n.events.forEach((e) => all.push({ n, e }))); all.sort((a, b) => a.e.at - b.e.at);
  const t0 = startOfDay(new Date()).getTime();
  const groups = [['오늘', (x) => x.e.at >= t0 && x.e.at < t0 + DAYMS], ['내일', (x) => x.e.at >= t0 + DAYMS && x.e.at < t0 + 2 * DAYMS], ['앞으로', (x) => x.e.at >= t0 + 2 * DAYMS], ['지난 일정', (x) => x.e.at < t0]];
  const list = h('div', { class: 'alist' });
  if (!all.length) list.append(h('div', { class: 'empty' }, '아직 일정이 없어요.\n메모에 “내일 12시까지 회의자료 제출”처럼 적고 접으면 비서가 알아서 알람을 맞춰요.'));
  for (const [name, f] of groups) {
    const rows = all.filter(f); if (!rows.length) continue;
    list.append(h('div', { class: 'gh' }, `${name} ${rows.length}`));
    for (const { n, e } of rows) {
      const t = TH(n.theme).tab;
      list.append(h('div', { class: 'arow' + (e.done ? ' done' : '') },
        h('button', { class: 'ck', type: 'button', 'aria-label': e.done ? '완료 취소' : '완료', onclick: () => { e.done = !e.done; save(); renderAgenda(); renderTabs(); }, html: ico('check', 14) }),
        h('div', { class: 'ab' },
          h('button', { class: 'at', type: 'button', title: e.title, onclick: () => openNote(n.id) }, (e.deadline ? '[마감] ' : '') + e.title),
          h('div', { class: 'am' },
            h('span', {}, fmtWhen(e.at)),
            h('span', { class: 'kwchip', style: `background:${t.bg};color:${t.ink}` }, n.keyword || '메모'),
            h('select', { class: 'rep', 'aria-label': '반복', onchange: (ev) => { e.repeat = ev.target.value; save(); } },
              [['none', '한 번'], ['daily', '매일'], ['weekly', '매주']].map(([v, l]) => h('option', { value: v, selected: e.repeat === v }, l))),
            h('select', { class: 'rep', 'aria-label': '미리 알림', title: '미리 알림', onchange: (ev) => { e.pre = +ev.target.value; e.preFired = false; save(); } },
              [[0, '미리 알림 없음'], [10, '10분 전'], [30, '30분 전'], [60, '1시간 전'], [180, '3시간 전'], [1440, '하루 전']].map(([v, l]) => h('option', { value: v, selected: e.pre === v }, l))),
            h('button', { class: 'ib' + (e.alarm ? ' on' : ''), type: 'button', 'aria-label': '알람 켜기/끄기', title: e.alarm ? '알람 끄기' : '알람 켜기', onclick: () => { e.alarm = !e.alarm; if (e.alarm && e.at > Date.now()) { e.fired = false; e.preFired = false; } save(); renderAgenda(); renderTabs(); }, html: ico('bell', 15) }),
            h('button', { class: 'ib', type: 'button', 'aria-label': '일정 삭제', title: '일정 삭제', onclick: () => { n.events = n.events.filter((x) => x !== e); save(); renderAgenda(); renderTabs(); }, html: ico('trash', 15) })))));
    }
  }
  const card = h('div', { class: 'acard' },
    h('div', { class: 'ahead' }, h('h3', {}, '일정 정리'), h('button', { class: 'btn icon fold', type: 'button', 'aria-label': '책갈피로 접기', onclick: closeAll, html: ico('fold', 16) })),
    h('div', { class: 'brief' }, h('div', { class: 'sh' }, iel('sparkle', 12), `${C.charName(S)}의 브리핑`), briefing()),
    list,
    h('div', { class: 'afoot' },
      h('button', { class: 'btn', type: 'button', onclick: rescan }, iel('sparkle', 15), '메모에서 일정 모두 찾기'),
      h('button', { class: 'btn', type: 'button', onclick: demoAlarm }, iel('bell', 15), '5초 뒤 알람 체험')));
  root.replaceChildren(card);
  card.insertAdjacentHTML('afterbegin', clipSVG({ c: '#cfd4da', e: '#98a1ac', metal: true }, 145));
}
function rescan() {
  let added = 0; for (const n of S.notes) for (const c of P.parseEvents([n.title, n.text].filter(Boolean).join('\n'))) if (addEvent(n, c)) added++;
  save(); renderAgenda(); renderTabs();
  toast({ title: added ? `일정 ${added}개를 새로 찾았어요` : '새로 찾은 일정이 없어요', ttl: 2600 });
}
function demoAlarm() {
  let n = (openId && byId(openId)) || S.notes[0];
  if (!n) { n = blankNote(); n.keyword = '체험'; S.notes.unshift(n); }
  const e = addEvent(n, { title: '알람 체험: 이렇게 알려드려요', at: Date.now() + 5000 }); if (e) e.pre = 0;
  save(); renderAgenda(); renderTabs();
  toast({ title: '5초 뒤에 알람이 울려요', body: '바탕화면 알림과 캐릭터가 함께 알려드려요.', theme: n.theme, ttl: 3000 });
}

/* ─────────── 설정 ─────────── */
async function openSettings() {
  closePeek(true); closeBubble();
  keys = await api.keyStatus();
  modalOpen = true; updateHit(); api.focus();
  const m = $('#modal'); m.hidden = false;
  const st = S.settings;
  const seg = (key, opts, after) => h('div', { class: 'seg', role: 'group' }, opts.map(([v, l]) => h('button', { type: 'button', 'aria-pressed': String(String(st[key]) === String(v)), onclick: () => { st[key] = v; save(); after && after(); render(); } }, l)));
  const keyMsg = {};
  const testKey = async (name) => {
    keyMsg[name] = { t: '연결 확인 중…', ok: null }; render();
    const r = api.testKey ? await api.testKey(name) : { ok: keys[name] };
    keyMsg[name] = r.ok ? { t: '연결됐어요. 이제 AI가 이 키로 동작해요.', ok: true } : { t: r.error || '키를 확인하지 못했어요', ok: false };
    render();
  };
  const keyRow = (name, label, ph, help) => {
    const inp = h('input', { type: 'password', id: 'key-' + name, autocomplete: 'off', spellcheck: 'false', placeholder: keys[name] ? '저장됨 · 바꾸려면 새 키를 붙여넣기' : ph, 'aria-label': label + ' API 키' });
    const saveKey = async () => {
      const v = inp.value.trim();
      if (!v) { keyMsg[name] = { t: '키를 붙여넣은 뒤 저장을 눌러주세요.', ok: false }; render(); return; }
      keys = await api.setKey(name, v); await testKey(name);
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveKey(); });
    const msg = keyMsg[name];
    return h('div', { class: 'keybox' },
      h('div', { class: 'row' }, h('label', { for: 'key-' + name, style: 'min-width:120px' }, label), inp,
        h('button', { class: 'btn primary', type: 'button', onclick: saveKey }, '저장'),
        keys[name] ? h('button', { class: 'btn', type: 'button', onclick: () => testKey(name) }, '연결 확인') : null,
        keys[name] ? h('button', { class: 'btn', type: 'button', onclick: async () => { keys = await api.setKey(name, ''); keyMsg[name] = { t: '키를 지웠어요.', ok: null }; render(); } }, '지우기') : null),
      h('div', { class: 'keystate ' + (msg ? (msg.ok ? 'good' : msg.ok === false ? 'bad' : '') : keys[name] ? 'good' : '') },
        msg ? msg.t : keys[name] ? '저장된 키가 있어요.' : help));
  };
  const builtinAI = () => h('div', { class: 'keybox' },
    h('div', { class: 'keystate ' + (keys.anthropic ? 'good' : 'bad') }, keys.anthropic ? 'Claude: 키 없이 바로 연결돼요 (지금 로그인한 Claude 계정 사용). 처음 쓸 때 허용을 물어봐요.' : 'Claude: 이 화면에서는 연결할 수 없어요. claude.ai에서 열어주세요.'),
    h('div', { class: 'keystate ' + (keys.openai ? 'good' : 'bad') }, keys.openai ? '음성 메모: 말하면 바로 글로 바뀌어요.' : '음성 메모: 이 브라우저에서는 받아쓰기를 쓸 수 없어요 (Chrome에서 열어주세요).'),
    h('p', { class: 'note' }, '웹 미리보기는 보안 규칙 때문에 직접 넣은 API 키를 Claude·OpenAI 서버로 보낼 수 없어요. 내 Claude·OpenAI 키는 컴퓨터에 설치하는 데스크톱 앱의 설정에서 넣어요.'));
  // 내 사진으로 캐릭터 만들기 (자동 누끼)
  let maker = null;
  const pickChar = async (fs) => {
    try { const src = await readFileURL(fs[0]); maker = { src, mode: 'cutout', strength: 50, outline: true, result: null, busy: true }; render(); await remake(); }
    catch (err) { toast({ title: '이미지를 읽지 못했어요', body: err.message, ttl: 4000 }); }
  };
  const remake = async () => {
    if (!maker) return; maker.busy = true; render();
    try { const r = await window.Cutout.makeCharacter(maker.src, maker); maker.result = r.dataURL; maker.used = r.mode; }
    catch (err) { toast({ title: '캐릭터를 만들지 못했어요', body: err.message, ttl: 4000 }); }
    maker.busy = false; render();
  };
  const makerUI = () => !maker ? null : h('div', { class: 'maker' },
    h('div', { class: 'mk-imgs' },
      h('figure', {}, h('img', { src: maker.src, alt: '고른 사진' }), h('figcaption', {}, '고른 사진')),
      h('span', { class: 'mk-arrow', html: ico('fold', 18) }),
      h('figure', { class: 'mk-out' }, maker.result ? h('img', { src: maker.result, alt: '만든 캐릭터' }) : h('span', { class: 'lbl' }, '만드는 중…'),
        h('figcaption', {}, maker.busy ? '배경 지우는 중…' : maker.used === 'circle' && maker.mode === 'cutout' ? '주인공을 못 찾아 동그랗게 잘랐어요' : '이렇게 보여요'))),
    h('div', { class: 'row' }, h('label', { style: 'min-width:72px' }, '모양'),
      h('div', { class: 'seg', role: 'group' }, [['cutout', '배경 지우기(누끼)'], ['circle', '동그랗게 자르기'], ['original', '그대로']].map(([v, l]) =>
        h('button', { type: 'button', 'aria-pressed': String(maker.mode === v), onclick: () => { maker.mode = v; remake(); } }, l)))),
    maker.mode === 'cutout' ? h('div', { class: 'row' }, h('label', { for: 'mk-str', style: 'min-width:72px' }, '지우는 정도'),
      h('input', { type: 'range', id: 'mk-str', min: '0', max: '100', value: String(maker.strength), onchange: (e) => { maker.strength = +e.target.value; remake(); } }),
      h('span', { class: 'lbl' }, '배경이 남으면 오른쪽, 몸이 잘리면 왼쪽')) : null,
    h('div', { class: 'row' }, h('label', { style: 'min-width:72px' }, '흰 테두리'),
      h('div', { class: 'seg', role: 'group' }, [[true, '켜기'], [false, '끄기']].map(([v, l]) => h('button', { type: 'button', 'aria-pressed': String(maker.outline === v), onclick: () => { maker.outline = v; remake(); } }, l)))),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', type: 'button', disabled: maker.busy || !maker.result, onclick: () => { st.customChar = maker.result; st.character = 'custom'; maker = null; petChar = ''; save(); renderPet(); if (openId) renderCard(byId(openId)); render(); toast({ title: '새 캐릭터가 준비됐어요', ttl: 2500 }); } }, '이 캐릭터로 정하기'),
      h('button', { class: 'btn', type: 'button', onclick: () => { maker = null; render(); } }, '취소')));
  const armedDel = {};
  const secManager = () => h('div', { class: 'secman' },
    S.sections.map((x) => h('div', { class: 'row' },
      h('input', { type: 'text', value: x.name, maxlength: '10', 'aria-label': '섹션 이름', style: 'flex:0 1 150px;min-width:90px', onchange: (e) => { x.name = e.target.value.trim() || x.name; save(); renderTabs(); } }),
      h('span', { class: 'secsw' }, SEC_COLORS.map((c, i) => h('button', { type: 'button', class: 'sw', 'aria-label': `색 ${i + 1}`, 'aria-pressed': String((x.color || 0) % SEC_COLORS.length === i), style: `background:${c.bg}`, onclick: () => { x.color = i; save(); renderTabs(); render(); } }))),
      h('span', { class: 'lbl' }, `메모 ${notesIn(x.id).length}개`),
      h('button', { class: 'btn' + (armedDel[x.id] ? ' del armed' : ''), type: 'button', onclick: () => {
        if (!armedDel[x.id]) { armedDel[x.id] = 1; render(); setTimeout(() => { if (armedDel[x.id]) { delete armedDel[x.id]; render(); } }, 3000); return; }
        for (const n of notesIn(x.id)) { n.sectionId = ''; n.secManual = false; }
        S.sections = S.sections.filter((y) => y !== x); if (openSec === x.id) openSec = null; save(); renderTabs(); render();
      } }, armedDel[x.id] ? '정말 지울까요? (메모는 남아요)' : '지우기'))),
    (() => { const inp = h('input', { type: 'text', maxlength: '10', placeholder: '새 섹션 이름 (예: 공부)', 'aria-label': '새 섹션 이름', style: 'flex:0 1 200px' });
      const add = () => { if (addSection(inp.value)) { renderTabs(); render(); } };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) add(); });
      return h('div', { class: 'row' }, inp, h('button', { class: 'btn', type: 'button', onclick: add }, '섹션 추가')); })(),
    h('p', { class: 'note' }, '메모를 접으면 내용에 맞는 섹션으로 알아서 넣어줘요. 메모지 위쪽의 분류에서 직접 바꿀 수도 있어요.'));
  function render() {
    const panel = h('div', { class: 'panel', role: 'dialog', 'aria-label': '설정' },
      h('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, h('h3', {}, '설정'), h('button', { class: 'btn icon', type: 'button', 'aria-label': '닫기', onclick: closeSettings, html: ico('x', 16) })),
      h('h4', {}, 'AI 비서 캐릭터'),
      h('div', { class: 'chars' },
        C.ORDER.map((id) => h('button', { type: 'button', 'aria-pressed': String(st.character === id), onclick: () => { st.character = id; save(); renderPet(); if (openId) renderCard(byId(openId)); render(); } },
          h('span', { class: 'cv', html: C.charHTML(id) }), C.CHARS[id].name)),
        filePicker({ cls: 'charpick' + (st.character === 'custom' ? ' on' : ''), label: '내 이미지로 캐릭터 만들기', multiple: false, onFiles: pickChar },
          h('span', { class: 'cv', html: st.customChar ? C.charHTML('custom', st.customChar) : ico('image', 26) }), st.customChar ? '내 사진 바꾸기' : '내 사진으로')),
      makerUI(),
      h('p', { class: 'note' }, '내 사진을 고르면 배경을 자동으로 지우고 스티커처럼 테두리를 둘러 캐릭터로 만들어요. 사진은 이 컴퓨터 밖으로 나가지 않아요.'),
      h('div', { class: 'row' }, h('label', {}, '이름'), h('input', { type: 'text', maxlength: '8', value: st.petName, placeholder: (C.CHARS[st.character] || C.CHARS.mikang).name, oninput: (e) => { st.petName = e.target.value; save(); } })),
      h('h4', {}, '화면'),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '책갈피 위치'), seg('side', [['left', '왼쪽'], ['right', '오른쪽']], applySide)),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '표시 방식'), seg('modeOverride', [['auto', '자동'], ['desktop', '항상 책갈피'], ['pet', '항상 캐릭터만']], () => { api.applySettings({ modeOverride: st.modeOverride }); applyMode(); })),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '캐릭터만 남길 때'), seg('petTarget', [['all', '바탕화면이 아니면 항상'], ['browser', '웹 브라우저를 쓸 때만']], applyMode)),
      h('p', { class: 'note' }, '자동: 바탕화면이 보이면 책갈피가 펼쳐지고, 다른 앱이나 웹을 쓰는 동안에는 캐릭터만 남아요. 캐릭터를 누르면 그 화면에서 책갈피가 나와요.'),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '가장자리 미리보기'), seg('peek', [[true, '켜기'], [false, '끄기']]), seg('peekDelay', [[200, '빠르게'], [350, '보통'], [600, '천천히']])),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '모아보기 위젯'), seg('showWidget', [[true, '화면 위에 보이기'], [false, '숨기기']], renderWidget)),
      h('h4', {}, '섹션 (큰 책갈피)'),
      secManager(),
      h('h4', {}, '날씨'),
      h('div', { class: 'row' }, h('label', { for: 'wcity', style: 'min-width:96px' }, '지역'),
        h('input', { type: 'text', id: 'wcity', maxlength: '20', value: st.weatherCity, placeholder: '예: 서울, 부산, 제주', onchange: (e) => { st.weatherCity = e.target.value.trim() || '서울'; save(); } }),
        h('button', { class: 'btn', type: 'button', onclick: () => { closeSettings(); askWeather('오늘 날씨'); } }, '지금 날씨 묻기')),
      h('h4', {}, '자동 정리 · 알람'),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '자동 정리'), seg('autoOrganize', [[true, '메모를 접으면 자동으로'], [false, '버튼 누를 때만']])),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '마감 미리 알림'), seg('preDeadline', [[0, '없음'], [30, '30분 전'], [60, '1시간 전'], [180, '3시간 전'], [1440, '하루 전']])),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '일정 미리 알림'), seg('preNormal', [[0, '없음'], [10, '10분 전'], [30, '30분 전'], [60, '1시간 전']])),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '아침 브리핑'), seg('morningBrief', [[true, '켜기'], [false, '끄기']])),
      h('h4', {}, 'AI 연결'),
      keys.builtin ? builtinAI() : [
        keyRow('anthropic', 'Claude API 키', 'sk-ant-로 시작하는 키 붙여넣기', '메모 정리·사진 속 일정 읽기·부탁하기에 써요. 없으면 기본 규칙으로 정리해요.'),
        keyRow('openai', 'OpenAI API 키', 'sk-로 시작하는 키 붙여넣기', '녹음을 글로 바꾸는 받아쓰기에 써요.'),
        h('p', { class: 'note' }, '키는 이 컴퓨터에만 암호화해서 저장되고, 저장하면 바로 연결을 확인해요. 환경변수 ANTHROPIC_API_KEY, OPENAI_API_KEY로도 넣을 수 있어요.')],
      h('h4', {}, '기타'),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '컴퓨터 켤 때 실행'), seg('launchAtLogin', [[true, '켜기'], [false, '끄기']], () => api.applySettings({ launchAtLogin: st.launchAtLogin }))),
      h('div', { class: 'row' },
        h('button', { class: 'btn', type: 'button', onclick: () => api.openData() }, '데이터 폴더 열기'),
        h('button', { class: 'btn', type: 'button', onclick: () => api.quit() }, '앱 종료')),
      h('p', { class: 'note' }, '단축키: Ctrl/⌘ + Shift + M 책갈피 펼치기 · Ctrl/⌘ + Shift + R 녹음 메모'));
    m.replaceChildren(panel);
  }
  m.onpointerdown = (e) => { if (e.target === m) closeSettings(); };
  render();
}
function closeSettings() { modalOpen = false; modalKind = ''; $('#modal').hidden = true; $('#modal').replaceChildren(); renderTabs(); applyMode(); updateHit(); }

/* ─────────── 메모 모아보기 (항상 위 위젯 + 전체 보드) ─────────── */
let boardFilter = 'all';
function renderWidget() {
  const w = $('#widget'); if (!w || !S) return;
  w.hidden = !S.settings.showWidget;
  const total = S.notes.filter((n) => !isEmpty(n)).length, today = todayEvents().length;
  w.replaceChildren(h('button', { type: 'button', class: 'wbtn', title: '모든 메모를 한눈에 보기', onclick: () => (modalKind === 'board' ? closeBoard() : openBoard()) },
    h('span', { class: 'wpin', html: ico('pin', 15) }), h('b', {}, '메모 모아보기'), h('span', { class: 'wcount' }, String(total)),
    today ? h('span', { class: 'wtoday' }, `오늘 ${today}`) : null));
}
function openBoard(filter) {
  if (openId || agendaOpen) closeAll();
  closePeek(true); closeBubble();
  if (filter !== undefined) boardFilter = filter;
  if (boardFilter !== 'all' && boardFilter !== '' && !secById(boardFilter)) boardFilter = 'all';
  modalOpen = true; modalKind = 'board'; updateHit(); api.focus();
  const m = $('#modal'); m.hidden = false; m.classList.add('boardwrap');
  m.onpointerdown = (e) => { if (e.target === m) closeBoard(); };
  renderBoard();
}
function closeBoard() {
  modalOpen = false; modalKind = '';
  const m = $('#modal'); m.hidden = true; m.classList.remove('boardwrap'); m.replaceChildren(); m.onpointerdown = null;
  updateHit();
}
const boardHash = () => S.notes.map((n) => n.id + noteHash(n) + secIdOf(n)).join('|');
function boardOverview() {
  const notes = S.notes.filter((n) => !isEmpty(n)), now = Date.now(), lines = [];
  const today = todayEvents();
  lines.push(today.length ? `오늘 할 일 ${today.length}개: ${today.slice(0, 3).map((x) => `${fmtTime(new Date(x.e.at))} ${x.e.title}`).join(', ')}${today.length > 3 ? ' 외' : ''}` : '오늘 잡힌 일정은 없어요.');
  const dls = []; S.notes.forEach((n) => n.events.forEach((e) => { if (e.deadline && !e.done && e.at > now) dls.push(e); })); dls.sort((a, b) => a.at - b.at);
  if (dls.length) lines.push(`다가오는 마감: ${dls.slice(0, 3).map((e) => `${e.title} (${fmtWhen(e.at)})`).join(', ')}`);
  for (const x of [...S.sections, INBOX]) { const l = notesIn(x.id).filter((n) => !isEmpty(n)); if (l.length) lines.push(`[${x.name}] ${l.length}개 · ${l.slice(0, 4).map((n) => n.keyword || '메모').join(', ')}${l.length > 4 ? ' …' : ''}`); }
  return { head: `메모 ${notes.length}개가 섹션 ${S.sections.length}개에 정리돼 있어요.`, lines };
}
async function aiBoardSummary(btn) {
  btn.disabled = true; btn.replaceChildren(iel('sparkle', 14), '요약하는 중…'); setMood('think');
  const notes = S.notes.filter((n) => !isEmpty(n)).map((n) => ({ section: secOf(n).name, keyword: n.keyword, title: n.title, text: n.text.slice(0, 600),
    events: n.events.filter((e) => !e.done).map((e) => `${fmtDate(new Date(e.at))} ${fmtTime(new Date(e.at))} ${e.title}${e.deadline ? ' (마감)' : ''}`) }));
  const r = keys.anthropic && api.summarize ? await api.summarize({ notes }).catch(() => ({ ok: false })) : { ok: false, reason: 'nokey' };
  if (r.ok && r.text) { S.boardAI = { hash: boardHash(), text: r.text.trim(), at: Date.now() }; save(); }
  else toast({ title: r.reason === 'nokey' ? 'AI 요약에는 Claude 연결이 필요해요' : 'AI 요약을 하지 못했어요', body: r.error || (r.reason === 'nokey' ? '설정 → AI 연결을 확인해 주세요. 지금은 기본 요약을 보여드려요.' : ''), ttl: 5000 });
  setMood('idle'); if (modalKind === 'board') renderBoard();
}
function boardNote(n) {
  const t = TH(n.theme), ne = nextEvent(n);
  const seedN = [...n.id].reduce((a, ch) => a + ch.charCodeAt(0), 0), rot = ((seedN % 7) - 3) * 0.7;
  const lines = (n.summary.length ? n.summary : n.text.split('\n').map((l) => l.trim()).filter(Boolean)).slice(0, 3);
  const el = h('button', { type: 'button', class: 'bnote', 'data-id': n.id, style: `--nf:${t.fill};--ns:${t.stroke};--nh:${t.hl};--rot:${rot}deg;--pin:${t.clip.c}`, title: '눌러서 이 메모 열기', 'aria-label': `${n.keyword || '메모'} 메모 열기`, onclick: () => { closeBoard(); openNote(n.id); } },
    h('span', { class: 'bpin' }),
    h('span', { class: 'bk' }, n.keyword || '메모'),
    n.title ? h('span', { class: 'bt' }, n.title) : null,
    h('span', { class: 'bl' }, lines.map((l) => h('span', {}, l))),
    n.photos.length ? h('span', { class: 'bph' }, n.photos.slice(0, 3).map((src) => h('img', { src: /^data:image\//.test(src) ? src : '', alt: '' }))) : null,
    ne ? h('span', { class: 'chip' }, ne.deadline ? h('span', { class: 'dl' }, '마감') : iel('bell', 11), `${fmtWhen(ne.at)} ${ne.title}`) : null);
  bindImageDrop(el, () => byId(n.id));
  return el;
}
function renderBoard() {
  const m = $('#modal'), ov = boardOverview();
  const ai = S.boardAI && S.boardAI.hash === boardHash() ? S.boardAI : null;
  const live = (id) => notesIn(id).filter((n) => !isEmpty(n));
  const secs = [...S.sections]; if (live('').length) secs.push(INBOX);
  const total = S.notes.filter((n) => !isEmpty(n)).length;
  const chips = h('div', { class: 'bfilter', role: 'group', 'aria-label': '섹션 고르기' },
    h('button', { type: 'button', 'aria-pressed': String(boardFilter === 'all'), onclick: () => { boardFilter = 'all'; renderBoard(); } }, `전체 ${total}`),
    secs.map((x) => { const c = secColor(x); return h('button', { type: 'button', 'aria-pressed': String(boardFilter === x.id), style: `--tc:${c.bg};--ti:${c.ink}`, onclick: () => { boardFilter = x.id; renderBoard(); } }, `${x.name} ${live(x.id).length}`); }));
  const groups = h('div', { class: 'bgroups' });
  for (const x of secs) {
    if (boardFilter !== 'all' && boardFilter !== x.id) continue;
    const list = live(x.id), c = secColor(x);
    const wall = h('div', { class: 'bnotes' }, list.map(boardNote),
      h('button', { type: 'button', class: 'bnote add', onclick: () => { closeBoard(); newNote(true, x.id); } }, iel('plus', 22), h('span', {}, `${x.name}에 새 메모`)));
    const g = h('section', { class: 'bgroup', 'aria-label': `${x.name} 섹션` }, h('h3', { class: 'blabel', style: `--tc:${c.bg};--ti:${c.ink}` }, x.name, h('span', {}, String(list.length))), wall);
    bindImageDrop(g, () => null, () => newNote(false, x.id));
    groups.append(g);
  }
  const panel = h('div', { class: 'board', role: 'dialog', 'aria-label': '메모 모아보기' },
    h('header', { class: 'bhead' }, h('div', { class: 'btitle' }, iel('pin', 20), h('h2', {}, '메모 모아보기'), h('span', { class: 'lbl' }, '메모를 누르면 그 메모지로 넘어가요 · 사진을 끌어다 놓으면 그 메모에 들어가요')),
      h('button', { class: 'btn icon', type: 'button', 'aria-label': '닫기', onclick: closeBoard, html: ico('x', 16) })),
    h('div', { class: 'bsum' },
      h('div', { class: 'bsum-h' }, iel('sparkle', 14), h('span', {}, ai ? `${C.charName(S)}의 AI 요약` : '한눈에 보기'),
        h('button', { class: 'btn', type: 'button', onclick: (e) => aiBoardSummary(e.currentTarget) }, iel('sparkle', 14), ai ? '다시 요약' : 'AI로 전체 요약')),
      ai ? h('div', { class: 'bsum-ai' }, ai.text) : [h('p', { class: 'bsum-lead' }, ov.head), h('ul', {}, ov.lines.map((l) => h('li', {}, l)))]),
    chips, total ? groups : h('div', { class: 'empty' }, '아직 메모가 없어요. 캐릭터를 눌러 책갈피를 펼치고 새 메모를 적어보세요.'));
  m.replaceChildren(panel);
}

/* ─────────── 시작 ─────────── */
function applySide() {
  const left = S.settings.side === 'left';
  $('#stage').classList.toggle('side-left', left); $('#stage').classList.toggle('side-right', !left);
  placePet();
}
function seed() {
  const mk = (theme, sectionId, text, x = {}) => {
    const a = P.localAnalyze(text, x.title || '');
    const n = { id: uid(), theme, sectionId, secManual: true, title: x.title || '', text, keyword: x.keyword || a.keyword, kwManual: false, summary: a.summary, events: [], photos: [], stickers: x.stickers || [], audios: [], aiSource: 'local', createdAt: Date.now() - (x.age || 0), viewedAt: Date.now() - (x.age || 0), orgHash: '' };
    for (const ev of a.events) addEvent(n, ev);
    n.orgHash = noteHash(n);
    return n;
  };
  return { v: 3, nextTheme: 4, lastBrief: '', sections: DEFAULT_SECTIONS(), notes: [
    mk('cherry', 's-work', '내일 12시까지 회의자료 제출\n- 지난주 회의록 정리\n- 디자인 시안 2개 첨부', { age: 1000 }),
    mk('butter', 's-work', '다음주 월요일 오전 10시 중간 발표\n발표 10분, 질문 5분', { age: 3000, stickers: [{ id: uid(), type: 'tape', x: 300, y: 34, s: 0.8, rot: 8 }] }),
    mk('blue', 's-work', '주간 보고 쓰기\n- 이번 주 한 일\n- 다음 주 계획', { age: 5000, keyword: '주간 보고' }),
    mk('olive', 's-life', '우유, 달걀, 두부, 대파\n내일 저녁 7시 마트 들르기', { age: 2000 }),
    mk('notebook', 's-life', '금요일 오후 4시 치과 정기검진', { age: 6000 }),
    mk('pink', 's-idea', '앱 이름 후보\n귤메모 / 책갈피 / 모아둠\n다음 회의 때 투표하기', { age: 4000, keyword: '이름 후보', title: '아이디어' }),
  ] };
}
function normalize(s) {
  s.settings = Object.assign({}, DEFAULTS, s.settings || {});
  // 이전 웹 버전(chaekgalpi-memo-v1) 데이터의 side 값을 이어받는다
  if (s.side && !s._sideMigrated) { s.settings.side = s.side; s._sideMigrated = true; }
  if (!Array.isArray(s.sections)) s.sections = DEFAULT_SECTIONS();
  for (const n of s.notes) {
    n.events = n.events || []; n.photos = n.photos || []; n.stickers = n.stickers || []; n.summary = n.summary || []; n.audios = n.audios || [];
    n.title = n.title || ''; n.text = n.text || ''; n.keyword = n.keyword || ''; n.ring = false;
    for (const e of n.events) { if (e.pre == null) e.pre = 0; if (e.preFired == null) e.preFired = false; }
  }
  return s;
}

function bindGlobal() {
  api.onCursor((c) => { cursor = c; if (!c.on) cursor.x = -1; updateHit(); handleEdge(c); handlePeekLeave(c); });
  document.addEventListener('mousemove', (e) => { cursor = { x: e.clientX, y: e.clientY, edge: cursor.edge, on: true }; updateHit(); });
  api.onForeground((f) => {
    if (f.kind === 'self') return;
    const wasPet = petMode();
    if (f.kind !== 'app') dockFolded = false;
    ctx = f.kind === 'app' ? 'app' : 'desktop'; fgBrowser = !!f.browser;
    // 사용자가 다른 앱을 누르면 펼쳐 둔 것을 정리해서 접는다 (녹음은 계속된다)
    if ((openId || agendaOpen || summoned || (bubble.open && bubble.menu)) && !modalOpen) closeAll();
    if (wasPet !== petMode()) applyMode(); else renderPetBadges();
  });
  // 사진 파일을 화면 어디에 놓아도 메모에 들어간다 (열린 메모가 없으면 새 메모)
  let dragN = 0;
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
  document.addEventListener('dragenter', (e) => { if (hasFiles(e)) { dragN++; $('#stage').classList.add('filedrag'); } });
  document.addEventListener('dragleave', (e) => { if (hasFiles(e) && --dragN <= 0) { dragN = 0; $('#stage').classList.remove('filedrag'); } });
  document.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  document.addEventListener('drop', async (e) => {
    dragN = 0; $('#stage').classList.remove('filedrag');
    if (!hasFiles(e)) return;
    e.preventDefault();
    if (e.defaultPrevented && e._handled) return;
    if ([...document.querySelectorAll('.dropping')].length) return;
    const all = e.dataTransfer?.files || [], fs = imageFiles(all);
    if (!fs.length) { if (all.length) toast({ title: '사진 파일만 넣을 수 있어요', ttl: 3000 }); return; }
    if (e.target.closest && e.target.closest('.card,.pet,.tab,.bnote,.bgroup')) return; // 각자 처리
    if (modalKind === 'board') closeBoard();
    let n = openId ? byId(openId) : null;
    if (!n) n = newNote(false);
    await addPhotos(n, fs);
    if (openId !== n.id) openNote(n.id);
  });
  api.onDisplay(() => { fit(); placePet(); });
  api.onOpenNote((id) => { if (id && byId(id)) openNote(id); });
  api.onCommand((cmd) => {
    if (cmd === 'summon') onPetClick();
    else if (cmd === 'board') openBoard();
    else if (cmd === 'new') newNote();
    else if (cmd === 'record') quickRecord();
    else if (cmd === 'agenda') toggleAgenda();
    else if (cmd === 'settings') openSettings();
    else if (cmd.startsWith('mode:')) { S.settings.modeOverride = cmd.slice(5); forcedMode = null; save(); applyMode(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modalOpen) { if (viewerKeys) closeViewer(); else if (modalKind === 'board') closeBoard(); else closeSettings(); return; }
    const p = $('.pal:not([hidden])'); if (p) { p.hidden = true; return; }
    if (addingSec) { addingSec = false; renderTabs(); return; }
    if (openId || agendaOpen || bubble.open || summoned) closeAll();
  });
  addEventListener('resize', () => { fit(); placePet(); });
  bindPet();
}

async function boot() {
  info = await api.info().catch(() => info);
  const m = (info.args || []).find((a) => a.startsWith('--mode='));
  if (m) forcedMode = m.slice(7);
  if (info.demo && $('#demoBg')) $('#demoBg').hidden = false;
  const loaded = await api.loadState().catch(() => null);
  S = normalize(loaded && Array.isArray(loaded.notes) ? loaded : seed());
  for (const n of S.notes) if (n.sectionId === undefined) { n.sectionId = guessSection(n); n.secManual = false; } // 섹션이 생기기 전 메모
  keys = await api.keyStatus().catch(() => keys);
  api.applySettings({ launchAtLogin: S.settings.launchAtLogin, modeOverride: S.settings.modeOverride });
  bindGlobal();
  applySide(); renderTabs(); renderPet(); fit(); applyMode();
  save();
  tick(); setInterval(tick, 5000);
  if (!loaded) setTimeout(() => say(`안녕하세요, ${C.charName(S)}예요! 저를 누르면 책갈피가 펼쳐지고 접혀요. 말풍선 버튼을 누르면 날씨나 부탁을 말할 수 있어요. 화면 위의 '메모 모아보기'로 모든 메모를 한눈에 볼 수 있어요.`, { ttl: 14000 }), 800);
  // 디버그/스크린샷용 훅
  window.__mk = { S: () => S, openNote, newNote, onPetClick, openPeek, openSettings, toggleAgenda, say, closeAll, askAssistant, setMood, applyMode, openBoard, closeBoard, toggleSection, toggleMenu, setCtx: (c) => { ctx = c; applyMode(); } };
}
boot();
})();
