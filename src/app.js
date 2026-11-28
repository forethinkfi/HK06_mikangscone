(() => {
'use strict';
const P = window.MemoParse, C = window.Chars, api = window.api;
const { DAYMS, WD, startOfDay, addDays, fmtTime, fmtWhen, fmtIn, fmtDate } = P;
const upcomingTime = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });

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
  send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
  gear: '<path d="M10 2.5h4l.6 2.5 1.4.6 2.2-1.4L21 7l-1.4 2.2.6 1.4 2.5.6v3.6l-2.5.6-.6 1.4 1.4 2.2-2.8 2.8-2.2-1.4-1.4.6-.6 2.5h-4l-.6-2.5-1.4-.6-2.2 1.4L3 19l1.4-2.2-.6-1.4-2.5-.6v-3.6l2.5-.6.6-1.4L3 7l2.8-2.8L8 5.6 9.4 5z" transform="translate(1.2 .3) scale(.9)"/><circle cx="12" cy="12" r="3"/>',
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
  { id: 'cherry', name: '체리 스캘럽', shape: 'scallop', stroke: '#d93a35', sw: 2.6, fill: '#fcf8ee', clip: { c: '#a9d3ee', e: '#7fb5da' }, clipX: 44, back: { t: 'g', a: '#b7cdee', b: '#eaf1fb' }, br: -2, tab: { bg: '#a9d3ee', ink: '#21425a' }, hl: 'rgba(217,58,53,.2)', rule: 'rgba(110,140,190,.3)', pad: '50px 40px 34px', orn: [{ t: 'starsilver', x: 2, y: 83, s: 58, r: -12 }] },
  { id: 'notebook', name: '레드 노트', shape: 'notebook', stroke: '#e4dccb', sw: 1.2, fill: '#fbf6ea', clip: { c: '#d6342e', e: '#a82320' }, clipX: 220, back: { t: 's', a: '#8f1f2c' }, br: 1.8, tab: { bg: '#d6342e', ink: '#ffffff' }, hl: 'rgba(214,52,46,.2)', rule: 'rgba(180,120,110,.3)', pad: '56px 34px 34px 58px', orn: [{ t: 'bowred', x: 73, y: 5, s: 96, r: 14 }] },
  { id: 'olive', name: '올리브 타원', shape: 'oval', stroke: '#8d9b86', ring: '#a9b5a2', sw: 2, fill: '#fbf6ea', clip: { c: '#f2ebd9', e: '#d3c9ae' }, clipX: 80, back: { t: 'g', a: '#aebcab', b: '#e6ece2' }, br: -2.5, tab: { bg: '#f2ebd9', ink: '#4b5645' }, hl: 'rgba(141,155,134,.34)', rule: 'rgba(120,135,112,.28)', pad: '86px 62px 76px', orn: [{ t: 'heartcream', x: 4, y: 84, s: 60, r: -8 }, { t: 'starsage', x: 85, y: 50, s: 50, r: 10 }] },
  { id: 'blue', name: '블루 스캘럽', shape: 'scallop', stroke: '#7d9cc8', sw: 1.8, fill: '#fcf8ee', clip: { c: '#cfd4da', e: '#98a1ac', metal: true }, clipX: 230, back: { t: 's', a: '#86a4c8' }, br: 2, tab: { bg: '#cfd4da', ink: '#2d3b4d' }, hl: 'rgba(125,156,200,.34)', rule: 'rgba(110,140,190,.3)', pad: '54px 44px 42px', orn: [{ t: 'heartsilver', x: 1, y: 84, s: 56, r: -8 }, { t: 'sealblue', x: 80, y: 84, s: 72, r: 0 }] },
  { id: 'butter', name: '버터 스티치', shape: 'stitch', stroke: '#e2cf9a', sw: 1.6, dash: '#c9a54a', fill: '#fcf8ee', clip: { c: '#f2dc8f', e: '#d6b955' }, clipX: 140, back: { t: 'g', a: '#f0d374', b: '#fbefc4' }, br: -2, tab: { bg: '#f2dc8f', ink: '#5a4712' }, hl: 'rgba(240,211,116,.55)', rule: 'rgba(200,165,80,.3)', pad: '54px 44px 40px', orn: [{ t: 'buttonstar', x: 0, y: 1, s: 60, r: -10 }] },
  { id: 'pink', name: '핑크 타원', shape: 'oval', stroke: '#eaa6b6', ring: '#f3c3cf', sw: 2, fill: '#fcf8f1', clip: { c: '#f2a9b9', e: '#d98698' }, clipX: 230, back: { t: 's', a: '#f3b9c5' }, br: 2.5, tab: { bg: '#f2a9b9', ink: '#5a2331' }, hl: 'rgba(242,169,185,.5)', rule: 'rgba(225,150,168,.3)', pad: '86px 62px 76px', orn: [{ t: 'starsilver', x: 2, y: 80, s: 60, r: -10 }, { t: 'bowpink', x: 78, y: 86, s: 70, r: 8 }] },
];
const TH = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

/* ─────────── 테마 묶음 (src/themes) ───────────
 * 테마마다 메모지 색·모양, AI 비서 캐릭터, 데스크톱 펫이 정해져 있다. 메모지 색이 있는 테마에서는
 * 메모마다 고른 색(n.paperColor)을 쓰고, 모양은 메모마다 자동으로 하나씩 정해진다. */
const themePack = () => (window.MemoThemes ? window.MemoThemes.get(S && S.settings.themePack) : null);
const voiceFor = (id = S.settings.character) => (C.CHARS[id] || Object.values(C.CHARS).find((c) => c.petId === id))?.voice;
const voiceLine = (key, values, fallback, id) => voiceFor(id)?.[key]?.(values) ?? fallback;
let activePetId;
function paperOf(n) {
  const tp = themePack(), cs = tp && tp.noteColors;
  if (!n || !cs || !cs.length) return null;
  const seed = [...String(n.id)].reduce((a, ch) => a * 31 + ch.charCodeAt(0) >>> 0, 7);
  const c = cs.find((x) => x.id === n.paperColor) || cs[seed % cs.length];
  const shapes = tp.paperShapes || [];
  return { ...c, shape: shapes.includes(n.paperShape) ? n.paperShape : shapes[(seed >>> 3) % shapes.length] ?? '' };
}
function selectCharacter(id) {
  const themes = window.MemoThemes.list();
  const current = themePack();
  const theme = (current?.id !== 'default' && current?.character === id && current)
    || themes.find((item) => item.id !== 'default' && item.character === id)
    || window.MemoThemes.get('default');
  S.settings.character = id;
  S.settings.themePack = theme.id;
  document.documentElement.dataset.themePack = theme.id;
  refreshOpenCards();
  if (peek.open) renderPeek();
  renderTabs();
  if (modalKind === 'board') renderBoard();
}

function applyPetMenuSelection(petId) {
  const id = C.ORDER.find((id) => C.CHARS[id].petId === petId)
    || (petId === S.settings.customPetId && 'custom');
  if (!id) return;
  selectCharacter(id);
  save();
  if (modalKind === 'settings') void openSettings();
}

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
  'mono-fish': { n: '생선', w: 54, className: 'mono-fish' },
  'mono-paw': { n: '발자국', w: 52, className: 'mono-paw' },
  'mono-yarn': { n: '털실', w: 56, className: 'mono-yarn' },
  'mono-star': { n: '별', w: 50, className: 'mono-star' },
  'mono-heart': { n: '하트', w: 50, className: 'mono-heart' },
};
const PAL = Object.keys(STK).filter((id) => !STK[id].className);
const stkSVG = (t) => {
  const d = STK[t];
  return d.className ? `<span class="mono-sticker ${d.className}" aria-hidden="true"></span>` : `<svg viewBox="${d.vb}" aria-hidden="true">${d.svg}</svg>`;
};

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
  character: C.defaultId, petName: '', customChar: '', side: 'right',
  modeOverride: 'auto', peek: true, peekDelay: 350,
  autoOrganize: true, preDeadline: 60, preNormal: 10, morningBrief: true, petScheduleBrief: true,
  launchAtLogin: true, weatherCity: '서울', themePack: window.__defaultThemePack || 'basic',
  letterDay: 5, letterTime: '17:00', petSize: 72, noteFontSize: 15, proPreview: false,
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
const memoTitle = (n) => n.title || n.keyword;
const isEmpty = (n) => !n.text.trim() && !n.title.trim() && !n.keyword.trim() && !n.photos.length && !n.stickers.length;

/* ─────────── 섹션 (큰 책갈피) ─────────── */
// 책갈피는 섹션(업무·생활·아이디어 …) 단위로 붙고, 섹션을 누르면 그 안의 메모 책갈피가 펼쳐진다.
const SEC_COLORS = [
  { bg: 'var(--mikkang-blue)', ink: 'var(--section-theme-ink, #2e4845)' }, { bg: 'var(--mikkang-pink)', ink: 'var(--section-theme-ink, #5a2331)' },
  { bg: 'var(--mikkang-yellow)', ink: 'var(--section-theme-ink, #5a4712)' }, { bg: 'var(--section-green, #cbdccc)', ink: '#2f4a2a' },
  { bg: 'var(--section-cream, #eee3bd)', ink: '#514531' }, { bg: 'var(--section-orange, #f7d0a9)', ink: '#5c3214' },
  { bg: 'var(--section-gray, #eae9df)', ink: '#454a43' }, { bg: 'var(--section-red, #e99868)', ink: '#48291a' },
];
const INBOX = { id: '', name: '분류 없음', color: 6 };
const DEFAULT_SECTIONS = () => [{ id: 's-work', name: '업무', color: 0 }, { id: 's-life', name: '생활', color: 3 }, { id: 's-idea', name: '아이디어', color: 1 }];
const secById = (id) => S.sections.find((x) => x.id === id);
const secIdOf = (n) => (n.sectionId && secById(n.sectionId) ? n.sectionId : '');
const secOf = (n) => secById(secIdOf(n)) || INBOX;
const monoSectionColors = ['#ffffff', '#ededed', '#dadada', '#bdbdbd', '#999999', '#707070', '#484848', '#202020']
  .map((bg, i) => ({ bg, ink: i >= 5 ? '#ffffff' : '#181818' }));
const sectionPalette = () => themePack()?.id.startsWith('mono-sketch') ? monoSectionColors : (themePack()?.sectionColors ?? SEC_COLORS);
const secColor = (x) => sectionPalette()[(x.color || 0) % SEC_COLORS.length];
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
function toggleSection(id) { shelfListId = null; openSec = openSec === id ? null : id; renderTabs(); }

let ctx = 'desktop', forcedMode = null;
let summoned = false, openId = null, selStk = null, modalOpen = false;
let petPresent = true;
let basicDetails = false;
const hasPremiumMemo = () => info.proPreview === true && S.settings.proPreview === true;
const petIdFor = (id) => id === 'custom' ? S.settings.customPetId : C.CHARS[id]?.petId;
let bubble = { open: false, menu: false, t: 0 };
let peek = { open: false, side: null, idx: 0, list: [] };
let cursor = { x: -1, y: -1, edge: null }, interactive = false, dragging = false;
const canOrganize = () => keys.openai || keys.hosted || keys.anthropic;
let keys = { anthropic: false, hosted: false }, info = { platform: '', demo: false };
let mood = 'idle', moodT = 0;

/* ─────────── 책갈피와 전체보기 표시 ─────────── */
function applyMode() {
  const keepDockVisible = (forcedMode || S.settings.modeOverride) === 'desktop' && !dockFolded;
  const showDock = keepDockVisible || summoned || !!openId || (!petPresent && !dockFolded);
  const st = $('#stage');
  st.classList.toggle('pet-hidden', !petPresent);
  st.classList.toggle('dock-hidden', !showDock);
  if (!showDock && $('#bookmark-pet')) placeBookmarkPet(); else queuePerch();
  if (showDock && (peek.open || edgeSide)) closePeek();
  const bg = $('#demoBg'); if (bg) bg.classList.toggle('desktop', ctx !== 'app');
  if (bubble.open) placeBubble();
  updateHit();
}

/* ─────────── 클릭 통과 판정 ─────────── */
const HIT = '.shelf-list,.shelf-more,#bookmark-pet,.tab,.subs,.sheet.open,.bubble,.peek.open,.toast,.modal';
function setInter(on) { if (on !== interactive) { interactive = on; api.setInteractive(on); } }
function updateHit() {
  if ((modalOpen && modalKind !== 'board') || dragging) { setInter(true); return; }
  if (cursor.x < 0) { setInter(false); return; }
  const el = document.elementFromPoint(cursor.x, cursor.y);
  if (modalKind === 'board' && el?.closest('.mikkang-overview')) { setInter(true); return; }
  setInter(!!(el && el.closest(HIT)));
}

/* ─────────── 책갈피 ─────────── */


let shelfListId = null;
let shelfQuery = '';
const editedAt = n => n.updatedAt || n.createdAt || 0;
function positionShelfList() {
  const panel = $('.shelf-list'), tab = $('.shelf-group .sec.exp');
  if (!panel || !tab) return;
  const stage = $('#stage').getBoundingClientRect();
  const rect = tab.getBoundingClientRect();
  panel.style.top = clamp(rect.top-stage.top,8,Math.max(8,stage.height-panel.offsetHeight-8))+'px';
}
function renderShelfList(section, notes) {
  const panel = h('section',{class:'shelf-list','aria-label':section.name+' 메모 목록'});
  const results = h('div',{class:'shelf-results'});
  const search = h('input',{type:'search',placeholder:section.name+' 메모 검색','aria-label':section.name+' 메모 검색',value:shelfQuery,
    oninput:e=>{shelfQuery=e.target.value; populate();positionShelfList();}});
  function populate() {
    const query=shelfQuery.trim().toLocaleLowerCase();
    const matches=notes.filter(n=>(memoTitle(n)+' '+n.text).toLocaleLowerCase().includes(query));
    results.replaceChildren(...matches.map(n=>{
      const row=h('button',{class:'shelf-result',type:'button',onclick:()=>{shelfListId=null;openNote(n.id);}},
        h('span',{class:'k'},memoTitle(n)||'새 메모'),h('small',{},new Date(editedAt(n)).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'})));
      bindTrashDrag(row,n);bindImageDrop(row,()=>n);return row;
    }));
    if(!matches.length) results.append(h('p',{},'검색 결과가 없어요.'));
  }
  const close = () => {shelfListId=null;renderTabs();$('.shelf-more')?.focus();};
  panel.append(h('header',{},h('strong',{},section.name+' 메모'),h('small',{},notes.length+'개'),
    h('button',{type:'button','aria-label':'메모 목록 닫기',onclick:close},iel('x',15))),search,h('small',{},'최근 수정순'),results);
  panel.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();close();}};
  $('#stage').append(panel);populate();positionShelfList();
}
function renderTabs() {
  $('.shelf-list')?.remove();
  queuePerch();
  const dock = $('#dock'); dock.replaceChildren();
  const secs = [...S.sections]; if (notesIn('').length) secs.push(INBOX);
  const tools = h('div',{class:'shelf-tools'});
  dock.append(tools);
  tools.append(h('button', {
    title:'전체보기', 'aria-label':'전체보기', class: 'tab overview-tab', type: 'button', 'aria-expanded': String(modalKind === 'board'),
    'aria-controls': 'modal', onclick: () => modalKind === 'board' ? closeBoard() : openBoard(),
  }, h('span', { class: 'overview-tab-label' }, iel('board', 16),
    h('span', {}, modalKind === 'board' ? '간단히 보기' : '전체보기'))));
  tools.append(h('button', { class: 'tab add', title:'새 메모', type: 'button', onclick: () => newNote(true, openSec ?? undefined), 'aria-label': '새 메모 만들기' }, h('span', { class: 'k', style: 'display:flex;align-items:center;gap:5px' }, iel('plus', 15), '새 메모')));
  for (const x of secs) {
    const list = notesIn(x.id).sort((a,b)=>editedAt(b)-editedAt(a)), c = secColor(x), exp = openSec === x.id;
    const tab = h('button', { class: 'tab sec' + (exp ? ' exp' : '') + (list.some((n) => n.ring) ? ' ring' : ''), type: 'button', 'data-sec': x.id, 'aria-expanded': String(exp), title: `${x.name} · 메모 ${list.length}개 (눌러서 ${exp ? '접기' : '펼치기'})`, style: `--tc:${c.bg};--ti:${c.ink}`, onclick: () => toggleSection(x.id) },
      h('span', { class: 'k' }, h('span', { class: 'sname' }, x.name), h('span', { class: 'cnt' }, String(list.length))));
    bindImageDrop(tab, () => null, () => newNote(false, x.id));
    const group = h('div',{class:'shelf-group'});
    dock.append(group); group.append(tab);
    if (exp) {
      const wrap = h('div', { class: 'subs', role: 'group', 'aria-label': `${x.name} 메모` });
      list.slice(0,2).forEach((n) => {
        const t = TH(n.theme);
        const tabPaper = themePack()?.id.startsWith('mono-sketch') ? secColor(secOf(n)) : paperOf(n) || t.tab;
        const st = h('button', { class: 'tab sub' + ((openId === n.id || parkedSheets.has(n.id)) ? ' open' : '') + (n.ring ? ' ring' : ''), type: 'button', 'data-id': n.id, title: memoTitle(n), style: `--tc:${tabPaper.tab || tabPaper.bg};--ti:${tabPaper.ink || t.tab.ink}`, onclick: () => toggleNote(n.id) },
          h('span', { class: 'k' }, memoTitle(n) || '새 메모'));
        bindTrashDrag(st, n);
        bindImageDrop(st, () => byId(n.id));
        wrap.append(st);
      });
      group.append(wrap);
      if (list.length > 2) {
        group.append(h('button',{class:'shelf-more',type:'button','aria-expanded':String(shelfListId===x.id),
          onclick:()=>{shelfQuery='';shelfListId=shelfListId===x.id?null:x.id;renderTabs();$('.shelf-list input')?.focus();}},'다른 메모 '+(list.length-2)+'개'));
        if(shelfListId===x.id) renderShelfList(x,list);
      }
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
  if (!petPresent) dock.append(h('button', { class: 'tab', type: 'button', 'aria-controls': 'dock', 'aria-expanded': 'true',
    onclick: () => { togglePetBookmarks(); $('#bookmark-expand').focus({ preventScroll: true }); } }, '책갈피 접기'));
}
function trashNote(note) {
  parkedSheets.get(note.id)?.sheet.remove();
  parkedSheets.delete(note.id);
  const i = S.notes.indexOf(note);
  if (i < 0) return;
  S.notes.splice(i, 1);
  S.trash.unshift({ note, removedAt: Date.now() });
  overviewSelected.delete(note.id);
  if (openId === note.id) {
    openId = null;
    closeNote();
  } else renderTabs();
  if (modalKind === 'board') renderBoard();
  save();
  toast({ title: '메모를 휴지통으로 보냈어요.', actions: [{ label: '복원', run: () => restoreNote(note.id) }], ttl: 4000 });
}

function restoreNote(id) {
  const index = S.trash.findIndex((entry) => entry.note.id === id);
  if (index < 0) return;
  const [{ note }] = S.trash.splice(index, 1);
  if (note.sectionId && !secById(note.sectionId)) note.sectionId = '';
  S.notes.unshift(note);
  save(); renderTabs();
  if (modalKind === 'board') renderBoard();
}

function bindTrashDrag(tab, note) {
  let press, moved = false;
  const label = $('.k', tab);
  const lift = e => Math.max(0, press.y - e.clientY);
  const upward = e => lift(e) > Math.abs(e.clientX - press.x);
  const ready = e => upward(e) && lift(e) >= 36;
  tab.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !e.isPrimary) return;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY }; moved = false;
    tab.setPointerCapture(e.pointerId);
  });
  tab.addEventListener('pointermove', (e) => {
    if (press?.id !== e.pointerId) return;
    if (!moved && (lift(e) < 7 || !upward(e))) return;
    moved = true; dragging = true; setInter(true);
    const armed = ready(e);
    tab.classList.toggle('trash-ready', armed);
    tab.style.translate = '0 ' + (-Math.min(32, lift(e) * .55)) + 'px';
    tab.style.opacity = String(1 - Math.min(.32, lift(e) / 120));
    label.textContent = armed ? '버리기' : memoTitle(note) || '새 메모';
  });
  const finish = (e) => {
    if (press?.id !== e.pointerId) return;
    const drop = moved && e.type === 'pointerup' && ready(e);
    press = null;
    if (!moved) return;
    dragging = false; updateHit();
    if (drop) {
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches && !document.hidden) {
        const rect = tab.getBoundingClientRect();
        const ghost = tab.cloneNode(true);
        const style = getComputedStyle(tab);
        Object.assign(ghost.style, {position:'fixed', pointerEvents:'none', margin:'0',
          left:rect.left+'px', top:rect.top+'px', width:rect.width+'px', height:rect.height+'px',
          minWidth:'0', minHeight:'0', transform:'none', translate:'none', zIndex:'100',
          background:style.background, color:style.color, borderRadius:style.borderRadius, font:style.font});
        ghost.inert = true;
        ghost.setAttribute('aria-hidden','true');
        ghost.style.writingMode = getComputedStyle(label).writingMode;
        document.body.append(ghost);
        const exit = ghost.animate([{transform:'translateY(0)',opacity:tab.style.opacity},
          {transform:'translateY(-24px)',opacity:0}], {duration:140,easing:'ease-out'});
        exit.finished.then(() => ghost.remove(), () => ghost.remove());
      }
      trashNote(note);
      return;
    }
    tab.classList.remove('trash-ready');
    tab.style.translate = '';
    tab.style.opacity = '';
    label.textContent = memoTitle(note) || '새 메모';
  };
  tab.addEventListener('pointerup', finish);
  tab.addEventListener('pointercancel', finish);
  tab.addEventListener('lostpointercapture', finish);
  tab.addEventListener('click', (e) => {
    if (moved) { e.preventDefault(); e.stopImmediatePropagation(); moved = false; }
  }, true);
  tab.title = (tab.title || '메모') + ' · 위로 끌어올려 휴지통에 보내기';
}

function setTabText(n) { const b = $(`.tab[data-id="${n.id}"] .k`); if (b) b.textContent = memoTitle(n) || '새 메모'; }

/* ─────────── 열기 · 닫기 ─────────── */
const noteHash = (n) => n.title + '\u0001' + n.text + '\u0001' + n.photos.length;
function commitCurrent(n = openId && byId(openId)) {
  if (!n) return;
  if (isEmpty(n)) { S.notes = S.notes.filter((x) => x !== n); return; }
  if (!memoTitle(n).trim() && n.text.trim()) n.keyword = P.guessKeyword(n.text, '');
  if (!n.summary.length && n.text.trim()) n.summary = P.summarize(n.text);
  if (!n.secManual && !secIdOf(n)) { const g = guessSection(n); if (g) n.sectionId = g; }
  // 자동화: 내용이 바뀐 채로 접으면 비서가 알아서 정리하고 알람까지 맞춘다
  if (S.settings.autoOrganize && (n.text.trim() || (canOrganize() && n.photos.length)) && n.orgHash !== noteHash(n)) organizeNote(n, { auto: true });
}
// Keep each open editor mounted so switching notes preserves selection and undo history.
const parkedSheets = new Map();
function parkSheet() {
  const sheet = $('#sheet');
  const note = byId(openId);
  if (!note) return;
  for (const el of sheet.querySelectorAll('[id]')) {
    el.dataset.editorId = el.id;
    el.removeAttribute('id');
  }
  sheet.removeAttribute('id');
  sheet.style.zIndex = '24';
  parkedSheets.set(note.id, { sheet, editor: activeNoteEditor, details: basicDetails });
}
function activateSheet(id) {
  if (openId === id) return;
  const saved = parkedSheets.get(id);
  if (openId) parkSheet();
  const empty = $('#sheet');
  if (saved) {
    if (empty && empty !== saved.sheet) empty.remove();
    parkedSheets.delete(id);
    saved.sheet.id = 'sheet';
    saved.sheet.style.removeProperty('z-index');
    for (const el of saved.sheet.querySelectorAll('[data-editor-id]')) {
      el.id = el.dataset.editorId;
      delete el.dataset.editorId;
    }
    activeNoteEditor = saved.editor;
    basicDetails = saved.details;
  } else if (!empty) {
    const sheet = h('section', { class:'sheet', id:'sheet', role:'dialog', 'aria-label':'메모지' });
    $('#dock').after(sheet);
  }
  if (!saved) basicDetails = false;
  openId = id;
}
function refreshOpenCards() {
  const selected = openId;
  if (!selected) return;
  for (const id of [...parkedSheets.keys(), selected]) {
    activateSheet(id);
    renderCard(byId(id));
  }
}
function closeAll({ keepDock = false } = {}) {
  shelfListId=null;
  for (const [id, { sheet }] of parkedSheets) {
    commitCurrent(byId(id));
    sheet.remove();
  }
  parkedSheets.clear();
  commitCurrent();
  openId = null; selStk = null; summoned = keepDock;
  $('#sheet').classList.remove('open');
  closeBubble();
  renderTabs(); applyMode(); save();
  api.release();
}
function closeNote() {
  if (!parkedSheets.size) { closeAll({ keepDock: true }); return; }
  commitCurrent();
  openId = null;
  activateSheet(Array.from(parkedSheets.keys()).pop());
  renderTabs(); applyMode(); save();
}
function toggleNote(id) {
  if (openId === id) closeNote(); else openNote(id);
}
function openNote(id) {
  const n = byId(id); if (!n) return;
  shelfListId=null;
  const weeks = Math.floor((Date.now() - (n.viewedAt || n.createdAt)) / (7 * DAYMS));
  if (modalKind === 'board') closeBoard();
  const mounted = parkedSheets.has(id) || openId === id;
  const previousSheet = openId && $('#sheet');

  closePeek(); closeBubble();
  activateSheet(n.id);
  if (!mounted && previousSheet && !n.position) {
    n.position = { x: previousSheet.offsetLeft + (S.settings.side === 'right' ? -28 : 28), y: previousSheet.offsetTop + 28 };
  }
  n.ring = false; n.viewedAt = Date.now(); selStk = null; openSec = secIdOf(n);
  if (!mounted) renderCard(n);
  $('#sheet').classList.add('open');
  renderTabs(); applyMode(); save();
  api.focus();
  const oldNote = weeks >= 2 && !isEmpty(n) && voiceLine('oldNote', { weeks }, '');
  if (oldNote) toast({ title: oldNote, theme: n.theme, ttl: 5000 });
}
function toggleAgenda() {
  if (modalKind !== 'board') openBoard();
  $('#overview-schedule')?.scrollIntoView({ block: 'nearest' });
  $('.upcoming-day[aria-pressed="true"]')?.focus({ preventScroll: true });
}
function blankNote(sectionId) {
  const idx = ((S.nextTheme || 0) + 1) % THEMES.length; S.nextTheme = idx;
  const sec = sectionId ?? openSec ?? '';
  return { id: uid(), theme: THEMES[idx].id, sectionId: sec, secManual: !!sec, title: '', text: '', keyword: '', kwManual: false, summary: [], events: [], photos: [], stickers: [], aiSource: '', createdAt: Date.now(), viewedAt: Date.now(), orgHash: '' };
}
function newNote(focus = true, sectionId) {
  const n = blankNote(sectionId);
  S.notes.unshift(n); save(); openNote(n.id);
  if (focus) setTimeout(() => { const t = $('#sheet .body'); t && t.focus(); }, 80);
  return n;
}

function togglePetBookmarks(anchor) {
  const closing = !$('#stage').classList.contains('dock-hidden');
  dismissPeek();
  if (modalKind === 'board') closeBoard();
  else if (viewerKeys) closeViewer();
  else if (modalOpen) closeSettings();
  if (closing) {
    dockFolded = true;
    closeAll();
    return;
  }
  perchOrigin = anchor;
  summoned = true;
  dockFolded = false;
  closeBubble();
  renderTabs();
  applyMode();
  api.focus();
  if (!bubble.menu) $('#dock').focus({ preventScroll: true });
}

/* ─────────── 메모지 카드 ─────────── */
function perchHTML() { return C.charHTML(S.settings.character, S.settings.customChar); }
function charColor() { return C.character(S.settings.character).color; }
function applyNoteFont() {
  document.documentElement.style.setProperty('--memo-font-size', (S.settings.noteFontSize || 15) + 'px');
}
function placeNote(note, sheet = $('#sheet')) {
  const pos = note?.position;
  if (!Number.isFinite(pos?.x) || !Number.isFinite(pos?.y)) {
    for (const key of ['left', 'right', 'top']) sheet.style.removeProperty(key);
    return;
  }
  sheet.style.right = 'auto';
  sheet.style.left = clamp(pos.x, 0, Math.max(0, W() - sheet.offsetWidth)) + 'px';
  sheet.style.top = clamp(pos.y, 0, Math.max(0, H() - sheet.offsetHeight)) + 'px';
}
const sheetListeners = new WeakMap();
function resetSheetListeners(sheet) {
  sheetListeners.get(sheet)?.abort();
  const controller = new AbortController();
  sheetListeners.set(sheet, controller);
  return controller.signal;
}
let activeNoteEditor;
function renderCard(n) {
  const t = TH(n.theme), sheet = $('#sheet');
  const activate = () => {
    if (openId !== n.id) { activateSheet(n.id); renderTabs(); }
  };
  const listenerOptions = { capture: true, signal: resetSheetListeners(sheet) };
  sheet.addEventListener('pointerdown', activate, listenerOptions);
  sheet.addEventListener('focusin', activate, listenerOptions);
  const basic = !hasPremiumMemo();
  sheet.classList.toggle('basic-note', basic);
  sheet.classList.toggle('basic-details', basic && basicDetails);
  const pp = paperOf(n), tp = themePack();
  sheet.dataset.paper = pp ? pp.shape : '';
  for (const [k, v] of [['--pc', pp && pp.bg], ['--pi', pp && pp.ink], ['--pt', pp && pp.tape]]) { if (v) sheet.style.setProperty(k, v); else sheet.style.removeProperty(k); }
  const card = h('div', { class: 'card', 'data-id': n.id, style: `--pad:${t.pad};--hl:${t.hl};--rule:${t.rule};--br:${t.br}deg` });
  const bk = t.back;
  card.append(h('div', { class: 'backing', style: bk.t === 'g'
    ? `background-color:${bk.b};background-image:linear-gradient(90deg,${bk.a}99 50%,transparent 50%),linear-gradient(${bk.a}99 50%,transparent 50%);background-size:24px 24px`
    : `background:${bk.a}` }));
  card.insertAdjacentHTML('beforeend', paperSVG(t));
  card.insertAdjacentHTML('beforeend', clipSVG(t.clip, t.clipX * 340 / 420));

  // 메모지 위에 앉은 캐릭터 — 누르면 AI 정리
  const perchLeft = t.clipX < 200 ? 228 : 32;
  const perch = h('div', { class: 'perch mood-' + mood + (perchLeft > 200 ? ' r' : ' l'), id: 'perch', title: '눌러서 AI 정리', style: `left:${perchLeft}px;--pc:${charColor()}`, onclick: () => organizeNote(n, {}) });
  perch.innerHTML = perchHTML() + '<div class="paws"><i></i><i></i></div>';
  perch.append(h('div', { class: 'say', id: 'perchSay' }));
  card.append(perch);

  const titleInput = h('input', {
    class: basic ? 'basic-note-caption' : 'kw', type: 'text', maxlength: '40',
    placeholder: '제목', 'aria-label': '메모 제목', value: memoTitle(n),
    oninput: (e) => { n.updatedAt = Date.now(); n.title = e.target.value; n.keyword = ''; n.kwManual = true; setTabText(n); save(); },
  });
  const onBlur = () => {
    if (!memoTitle(n).trim() && n.text.trim()) {
      n.keyword = P.guessKeyword(n.text, '');
      titleInput.value = n.keyword;
      setTabText(n);
    }
    renderChips(n);
    save();
  };
  const onImages = (files) => {
    const images = imageFiles(files);
    if (!images.length) return false;
    void addPhotos(n, images);
    return true;
  };
  const editor = window.BasicNote.editor(n, h, { onChange: () => { n.updatedAt=Date.now(); save(); }, onBlur, onImages, onView: (i) => openViewer(n, i) });
  activeNoteEditor = editor;
  const body = editor.el;
  const paperShape = pp && tp.paperShapes?.length > 1 && h('select', { class: 'paper-shape secsel', title: '메모지 모양', 'aria-label': '메모지 모양',
    onchange: (event) => {
      n.paperShape = event.target.value;
      sheet.dataset.paper = n.paperShape;
      save();
    } }, tp.paperShapes.map((shape) => h('option', { value: shape, selected: shape === pp.shape }, tp.paperLabels?.[shape] ?? shape)));
  const content = h('div', { class: 'content' }, basic ? null : titleInput, h('div', { class: 'ttlrow' }, sectionPicker(n), basic ? null : paperShape));
  const writing = h('div', { class: 'note-writing' }, body);
  content.append(writing);
  content.append(h('div', { class: 'chips', id: 'chips' }));
  card.append(content);
  card.append(h('div', { class: 'stk-layer', id: 'stkLayer' }));
  for (const o of t.orn) card.append(h('div', { class: 'orn', style: `left:${o.x}%;top:${o.y}%;width:${o.s}px;transform:rotate(${o.r}deg)`, html: stkSVG(o.t) }));

  card.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); card.classList.add('drop'); } });
  card.addEventListener('dragleave', (e) => { if (!card.contains(e.relatedTarget)) card.classList.remove('drop'); });
  card.addEventListener('drop', (e) => { card.classList.remove('drop'); const fs = imageFiles(window.MemoDrop.files(e.dataTransfer)); if (fs.length) { e.preventDefault(); const point = document.caretRangeFromPoint(e.clientX, e.clientY); addPhotos(n, fs, point && body.contains(point.commonAncestorContainer) ? point : undefined); } });
  card.addEventListener('pointerdown', (e) => { if (!e.target.closest('.stk,.sbar') && selStk) { selStk = null; renderStickers(n); } });

  const pal = h('div', { class: 'pal', hidden: true, role: 'menu', 'aria-label': '스티커' }, (tp?.stickers ?? PAL).map((k) =>
    h('button', { type: 'button', role: 'menuitem', 'aria-label': STK[k].n, title: STK[k].n, onclick: () => { pal.hidden = true; addSticker(n, k); }, html: stkSVG(k) })));
  const aiBtn = h('button', { class: 'btn primary', type: 'button', id: 'aiBtn', onclick: () => organizeNote(n, {}) }, iel('sparkle', 16), 'AI 정리');
  const albumButton = api.notion ? h('button',{class:'note-album',type:'button',onclick:async e=>{
    const button=e.currentTarget; button.disabled=true;
    try {
      const r=await api.notion('export',{title:memoTitle(n),text:n.text,section:secOf(n).name,photos:n.photos});
      toast({title:r.ok?'노션 앨범에 담았어요.':r.error || '노션 저장을 확인하세요.',ttl:4500});
    } finally {button.disabled=false;}
  }},'앨범에 담기') : null;
  const delBtn = h('button', { class: 'btn icon del', type: 'button', 'aria-label': '휴지통으로 보내기', title: '휴지통으로 보내기', onclick: () => trashNote(n) }, iel('trash', 16));
  const bar = h('div', { class: 'bar' }, pal,
    h('div', { class: 'row' },
      h('button', { class: 'btn icon fold', type: 'button', 'aria-label': '책갈피로 접기', title: '책갈피로 접기', onclick: closeNote, html: ico('fold', 16) }),
      filePicker({ cls: 'btn', title: '내 컴퓨터에서 사진 고르기', onFiles: (fs) => addPhotos(n, fs) }, iel('image', 16), '사진'),
      h('button', { class: 'btn', type: 'button', 'aria-haspopup': 'menu', onclick: () => { pal.hidden = !pal.hidden; } }, iel('star', 16), '스티커'),
      h('span', { style: 'margin-left:auto' }), aiBtn),
    h('div', { class: 'row' },
      h('span', { class: 'lbl' }, '스타일'),
      THEMES.map((x) => h('button', { class: 'sw', type: 'button', 'aria-label': x.name, title: x.name, 'aria-pressed': String(x.id === n.theme), style: `background:${x.clip.c}`, onclick: () => { n.theme = x.id; save(); renderCard(n); renderTabs(); } })),
      h('span', { style: 'margin-left:auto' }), delBtn));
  if (basic) {
    const menu = h('button', { class: 'basic-icon', type: 'button', 'aria-label': '메모 상세', 'aria-expanded': String(basicDetails), title: '메모 상세',
      onclick: () => {
        basicDetails = !basicDetails;
        sheet.classList.toggle('basic-details', basicDetails);
        placeNote(n);
        menu.setAttribute('aria-expanded', String(basicDetails));
      } }, '⋯');
    card.prepend(h('header', { class: 'basic-note-head' },
      h('button', { class: 'basic-icon', type: 'button', 'aria-label': '새 메모', title: '새 메모', onclick: () => newNote(), html: ico('plus', 16) }),
      titleInput, albumButton, menu,
      h('button', { class: 'basic-icon', type: 'button', 'aria-label': '메모 닫기', title: '메모 닫기', onclick: closeNote, html: ico('x', 16) })));
    editor.toolbar.append(filePicker({ cls: 'basic-photo', title: '사진 첨부', label: '사진 첨부', onFiles: onImages }, iel('image', 16)));
    if (pp && tp.noteColors.length > 1) editor.toolbar.append(h('span', { class: 'paper-colors', role: 'group', 'aria-label': '메모지 색' },
      tp.noteColors.map((c) => h('button', { type: 'button', 'aria-label': `${c.name} 메모지`, title: c.name, 'aria-pressed': String(c.id === pp.id), style: `--sw:${c.bg}`,
        onmousedown: (e) => e.preventDefault(),
        onclick: () => { n.paperColor = c.id; save(); renderCard(n); renderTabs(); } }))));
    if (paperShape) editor.toolbar.append(paperShape);
    card.append(editor.toolbar);
  } else if (albumButton) {
    content.append(albumButton);
  }
  for (const key of ['width', 'height']) {
    const value = n.size?.[key];
    if (Number.isFinite(value) && value > 0) sheet.style.setProperty('--note-' + key, value + 'px');
    else sheet.style.removeProperty('--note-' + key);
  }
  const grip = h('div', { class: 'note-move', title: '드래그해서 메모 이동' });
  card.append(grip);
  card.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0 || !(e.target === grip || e.target.matches('.basic-note-head'))) return;
    const startX = sheet.offsetLeft, startY = sheet.offsetTop;
    const move = (p) => {
      if (p.pointerId !== e.pointerId) return;
      n.position = { x: startX + p.clientX - e.clientX, y: startY + p.clientY - e.clientY };
      placeNote(n);
      n.position = { x: sheet.offsetLeft, y: sheet.offsetTop };
    };
    card.setPointerCapture(e.pointerId);
    dragging = true;
    card.addEventListener('pointermove', move);
    card.addEventListener('lostpointercapture', () => {
      card.removeEventListener('pointermove', move);
      dragging = false; updateHit(); save();
    }, { once: true });
  });
  const resize = h('button', { type: 'button', class: 'note-resize', title: '드래그하거나 방향키로 크기 조절', 'aria-label': '메모 크기 조절' });
  const direction = () => S.settings.side === 'right' ? -1 : 1;
  function sizeTo(width, height) {
    const top = sheet.offsetTop;
    const reserve = basic && !basicDetails ? 16 : 120;
    const right = sheet.offsetLeft + card.offsetWidth;
    n.size = { width: clamp(width, 280, W() - 32), height: clamp(height, 230, H() - top - reserve) };
    for (const [key, value] of Object.entries(n.size)) sheet.style.setProperty('--note-' + key, value + 'px');
    if (n.position && direction() === -1) n.position.x = right - card.offsetWidth;
    placeNote(n);
    save();
  }
  resize.onpointerdown = (event) => {
    if (event.button !== 0) return;
    const { clientX, clientY, pointerId } = event;
    const width = card.offsetWidth, height = card.offsetHeight;
    resize.setPointerCapture(pointerId);
    dragging = true;
    resize.onpointermove = (move) => {
      if (move.pointerId === pointerId) sizeTo(width + direction() * (move.clientX - clientX), height + move.clientY - clientY);
    };
    resize.onlostpointercapture = () => { resize.onpointermove = null; dragging = false; updateHit(); };
  };
  resize.onkeydown = (event) => {
    const delta = { ArrowLeft: [-16 * direction(), 0], ArrowRight: [16 * direction(), 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[event.key];
    if (delta) { event.preventDefault(); sizeTo(card.offsetWidth + delta[0], card.offsetHeight + delta[1]); }
  };
  card.append(resize);
  sheet.replaceChildren(card, bar);
  placeNote(n);
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
  const box = parkedSheets.get(n.id)?.sheet.querySelector('[data-editor-id=chips]') || $('#chips'); if (!box) return; box.replaceChildren();
  for (const e of n.events) {
    box.append(h('span', { class: 'chip' + (e.alarm && !e.done ? '' : ' off') },
      e.deadline ? h('span', { class: 'dl' }, '마감') : null,
      h('span', { class: 'chip-label' }, `${fmtWhen(e.at)} ${e.title}`),
      h('button', { type: 'button', class: 'dday-toggle', 'aria-label': `${e.title} 디데이 표시`,
        'aria-pressed': String(e.showDday === true), title: '디데이 표시 전환',
        onclick: () => { e.showDday = !e.showDday; save(); renderChips(n); },
      }, e.showDday ? ddayLabel(e.at) : '디데이'),
      h('button', { type: 'button', class: e.alarm ? 'on' : '', 'aria-label': '알람 켜기/끄기', title: e.alarm ? '알람 끄기' : '알람 켜기', onclick: () => { e.alarm = !e.alarm; if (e.alarm && e.at > Date.now()) { e.fired = false; e.preFired = false; } save(); renderChips(n); renderTabs(); }, html: ico('bell', 14) }),
      h('button', { type: 'button', 'aria-label': '일정 삭제', onclick: () => { n.events = n.events.filter((x) => x !== e); save(); renderChips(n); renderTabs(); }, html: ico('x', 13) })));
  }
  for (const c of candidates(n)) {
    box.append(h('span', { class: 'chip cand' }, h('button', { type: 'button', title: '알람으로 등록', onclick: () => { addEvent(n, c); save(); renderChips(n); renderTabs(); refreshAgenda(); } }, iel('plus', 13), h('span', { class: 'chip-label' }, `알람 ${fmtWhen(c.at)} ${c.title}`))));
  }
}

function ddayLabel(at) {
  const calendarDay = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const remaining = (calendarDay(new Date(at)) - calendarDay(new Date())) / DAYMS;
  return remaining === 0 ? 'D-Day' : remaining > 0 ? `D-${remaining}` : `D+${-remaining}`;
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
async function addPhotos(n, files, dropRange) {
  const editor = openId === n.id ? activeNoteEditor : parkedSheets.get(n.id)?.editor;
  const range = dropRange || editor?.insertionRange();
  const sources = [];
  for (const file of files) {
    if (sources.length + n.photos.length >= MAX_PHOTOS) break;
    try { sources.push(await readPhoto(file)); }
    catch (err) { toast({ title: '사진을 넣지 못했어요', body: file.name + ': ' + err.message, ttl: 5000 }); }
  }
  const available = Math.max(0, MAX_PHOTOS - n.photos.length);
  if (files.length > available) toast({ title: '사진은 메모 하나에 ' + MAX_PHOTOS + '장까지 넣을 수 있어요', ttl: 2600 });
  sources.splice(available);
  if (!sources.length) return 0;
  if (editor?.el.isConnected) editor.insertPhotos(sources, range);
  else {
    n.photos.push(...sources);
    if (openId === n.id) renderCard(n);
  }
  n.updatedAt = n.viewedAt = Date.now(); save(); renderTabs();
  const message = '사진 ' + sources.length + '장 넣었어요.';
  if (openId === n.id) perchSay(message, 3500);
  else say(message, { ttl: 5000, actions: [{ label: '메모 보기', run: () => openNote(n.id) }] });
  return sources.length;
}
async function openPhotoNote(files) {
  const existing = openId && byId(openId);
  if (existing) {
    if (viewerKeys) closeViewer();
    else if (modalKind === 'settings') closeSettings();
    await addPhotos(existing, files);
    if (byId(existing.id)) openNote(existing.id);
    return;
  }
  const note = blankNote();
  for (const file of files.slice(0, MAX_PHOTOS)) {
    try { note.photos.push(await readPhoto(file)); }
    catch (err) { toast({ title: '사진을 열지 못했어요', body: err.message, ttl: 4500 }); }
  }
  if (!note.photos.length) return;
  if (viewerKeys) closeViewer();
  else if (modalKind === 'settings') closeSettings();
  S.notes.unshift(note);
  openNote(note.id);
}
async function feedContent({ text, imageUrl }) {
  if (imageUrl) {
    try {
      let blob;
      if (api.readWebImage && /^https?:/i.test(imageUrl)) {
        const photo = await api.readWebImage(imageUrl);
        blob = new Blob([photo.bytes], { type: photo.type });
      } else {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error();
        blob = await response.blob();
      }
      if (!blob.type.startsWith('image/')) throw new Error();
      await openPhotoNote([new File([blob], '웹 이미지', { type: blob.type })]);
      return;
    } catch {
      toast({ title: '원본 사진을 읽을 수 없어 링크를 메모에 담았어요.', ttl: 4500 });
      text = text || imageUrl;
      if (/^data:/i.test(text)) return;
    }
  }
  if (!text?.trim()) return;
  if (viewerKeys) closeViewer();
  else if (modalKind === 'settings') closeSettings();
  const note = blankNote(); note.text = text;
  note.keyword = P.guessKeyword(text, '');
  S.notes.unshift(note); openNote(note.id);
}
/** 캐릭터·책갈피·모아보기 메모에 사진 파일을 끌어다 놓기 */
function bindImageDrop(el, target, makeNew) {
  el.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); el.classList.add('dropping'); } });
  el.addEventListener('dragleave', () => el.classList.remove('dropping'));
  el.addEventListener('drop', async (e) => {
    el.classList.remove('dropping');
    const fs = imageFiles(window.MemoDrop.files(e.dataTransfer)); if (!fs.length) return;
    e.preventDefault(); e.stopPropagation();
    if (modalKind === 'board') closeBoard();
    let n = target();
    if (!n) n = makeNew ? makeNew() : newNote(false);
    await addPhotos(n, fs);
    if (openId !== n.id) openNote(n.id);
  });
}

/* 사진 크게 보기 */
function removeNotePhoto(n, i) {
  if (n.basicHtml) {
    const template = document.createElement('template');
    template.innerHTML = n.basicHtml;
    for (const img of template.content.querySelectorAll('img[data-photo]')) {
      const index = Number(img.dataset.photo);
      if (index === i) img.remove();
      else if (index > i) img.dataset.photo = String(index - 1);
    }
    n.basicHtml = template.innerHTML;
  }
  return n.photos.splice(i, 1)[0];
}
function openViewer(n, i) {
  closePeek(); closeBubble();
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
        h('button', { class: 'btn', type: 'button', onclick: () => { removeNotePhoto(n, i); save(); if (openId === n.id) renderCard(n); show(); } }, iel('trash', 15), '삭제'),
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
  const src = removeNotePhoto(n, i);
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
function place(el, st) { el.style.width = (sizeOf(st) / 420 * 100) + '%'; el.style.left = (st.x / 420 * 100) + '%'; el.style.top = (st.y / 560 * 100) + '%'; el.style.transform = `translate(-50%,-50%) rotate(${st.rot}deg)`; }
function placeBar(bar, st, el) {
  const { clientWidth: width, clientHeight: height } = bar.parentElement;
  const hh = el ? el.offsetHeight : 40;
  bar.style.left = clamp(st.x * width / 420 - 60, 4, width - 124) + 'px';
  bar.style.top = clamp(st.y * height / 560 - hh / 2 - 48, 2, height - 40) + 'px';
}
function bindDrag(el, n, st) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const was = selStk === st.id; selStk = st.id;
    const card = el.closest('.card'), rect = el.parentElement.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY, ox = st.x, oy = st.y; let moved = false;
    el.setPointerCapture(e.pointerId); dragging = true;
    document.querySelectorAll('.stk.sel').forEach((x) => x.classList.remove('sel')); el.classList.add('sel');
    const mv = (ev) => { moved = true; st.x = clamp(ox + (ev.clientX - sx) * 420 / rect.width, -10, 430); st.y = clamp(oy + (ev.clientY - sy) * 560 / rect.height, -10, 570); place(el, st); const b = card.querySelector('.sbar'); if (b) placeBar(b, st, el); };
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
  nextPetBriefAt = Math.max(nextPetBriefAt, Date.now() + 90_000);
  const when = new Date(e.at);
  const title = pre
    ? voiceLine('scheduleSoon', { minutes: pre, title: e.title, deadline: e.deadline }, `${pre}분 뒤 ${e.deadline ? '마감' : '일정'} · ${e.title}`)
    : voiceLine('scheduleNow', e, `${e.deadline ? '마감 시간이에요' : '지금이에요'} · ${e.title}`);
  const body = `${fmtDate(when)} ${fmtTime(when)} · '${memoTitle(n) || '메모'}' 메모`;
  chime();
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
  deliverWeeklyLetter(now);
  void announcePetSchedule(now);
  if (dirty) { save(); renderTabs(); refreshAgenda(); }
}
let nextPetBriefAt = 0;
let petBriefPending = false;
async function announcePetSchedule(now) {
  if (now < nextPetBriefAt || petBriefPending || (api.petScheduleSpeech && !petPresent)) return;
  const soon = api.petScheduleSpeech && S.settings.petScheduleBrief
    ? S.notes.flatMap((n) => n.events).filter((e) => e.alarm && !e.done && !e.fired &&
        e.at - now >= 120_000 && e.at - now <= 30 * 60_000 && e.petBriefedAt !== e.at)
        .sort((a, b) => a.at - b.at)[0]
    : null;
  const date = new Date(now);
  const day = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const morning = !soon && S.settings.morningBrief && date.getHours() >= 7 && S.lastBrief !== day;
  if (!soon && !morning) return;
  const occurrence = soon?.at;
  const title = (e) => String(e.title || '일정').slice(0, 36);
  petBriefPending = true;
  nextPetBriefAt = now + 120_000;
  try {
    let line;
    const speaker = activePetId || petIdFor(S.settings.character) || S.settings.character;
    if (soon) {
      const minutes = Math.ceil((soon.at - now) / 60_000);
      line = voiceLine('scheduleSoon', { minutes, title: title(soon), deadline: soon.deadline },
        `미깡! ‘${title(soon)}’${soon.deadline ? ' 마감' : ''}까지 ${minutes}분 남았어. 슬슬 준비해 볼까?`, speaker);
    } else {
      const events = todayEvents().filter(({ e }) => e.allDay || e.at > now);
      const next = events[0]?.e;
      const time = next && (next.allDay ? '오늘 종일' : fmtTime(new Date(next.at)));
      line = voiceLine('morning', { count: events.length, next: next && title(next), time },
        next ? `좋은 아침이야! 오늘 일정 ${events.length}개야. ${time} ‘${title(next)}’부터 챙기자!`
          : '좋은 아침이야! 오늘 남은 일정은 없네. 귤 한 조각처럼 여유롭게 시작하자!', speaker);
      if (api.weather) {
        const weather = await weatherReply('오늘 날씨').catch(() => '');
        const temperature = weather.match(/-?\d+°C/);
        if (temperature) line += voiceLine('outside', { temperature: temperature[0] }, ` 지금 바깥은 ${temperature[0]}야.`, speaker);
      }
    }
    if (api.petScheduleSpeech && !perchedSpecies) {
      if (!await api.petScheduleSpeech(line, C.CHARS[speaker]?.petId || speaker)) {
        nextPetBriefAt = Date.now() + 5000;
        return;
      }
    } else {
      say(line, { ttl: 8000 });
    }
    if (soon) soon.petBriefedAt = occurrence;
    else S.lastBrief = day;
    save();
  } catch (error) {
    console.warn('펫 일정 안내를 표시하지 못했어요.', error);
  } finally {
    petBriefPending = false;
  }
}
function todayEvents() {
  const t0 = startOfDay(new Date()).getTime(), all = [];
  S.notes.forEach((n) => n.events.forEach((e) => all.push({ n, e })));
  return all.filter((x) => !x.e.done && x.e.at >= t0 && x.e.at < t0 + DAYMS).sort((a, b) => a.e.at - b.e.at);
}
function lunchLine(events, id, now = Date.now()) {
  if (!voiceFor(id)?.lunch) return '';
  const clock = new Date(now);
  const minuteOfDay = clock.getHours() * 60 + clock.getMinutes();
  if (minuteOfDay < 11 * 60 + 30 || minuteOfDay >= 13 * 60 + 30) return '';
  const next = events.find(({ e }) => !e.allDay && e.at > now);
  const minutes = next && Math.ceil((next.e.at - now) / 60_000);
  return minutes && minutes <= 30 ? voiceLine('lunch', { minutes }, '', id) : '';
}
function briefing() {
  const now = Date.now(), all = [];
  S.notes.forEach((n) => n.events.forEach((e) => all.push({ n, e })));
  const today = todayEvents();
  const nx = all.filter((x) => !x.e.done && x.e.alarm && x.e.at > now).sort((a, b) => a.e.at - b.e.at)[0];
  const list = today.slice(0, 3).map((x) => `${fmtTime(new Date(x.e.at))} ${x.e.title}${x.e.deadline ? '(마감)' : ''}`).join(', ') + (today.length > 3 ? ' 외' : '');
  const a = today.length ? `오늘 일정은 ${today.length}개예요. ${list}.` : '오늘 남은 일정이 없어요.';
  const b = nx ? ` 다음 알람은 ${fmtIn(nx.e.at - now)}, '${nx.e.title}'이에요.` : '';
  const line = voiceLine('briefing', { count: today.length, list, next: nx && `${fmtIn(nx.e.at - now)} ‘${nx.e.title}’` }, a + b);
  const lunch = lunchLine(today, undefined, now);
  return lunch ? `${line} ${lunch}` : line;
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
    events, reply: String(j.reply || '').trim(), section: String(j.section || '').trim(), src: j.src === 'openai' ? 'openai' : 'claude',
  };
}
function localResult(text, title) {
  const a = P.localAnalyze(text, title);
  return { keyword: a.keyword, title: '', body: text, summary: a.summary, events: a.events, reply: '', section: '', src: 'local' };
}
async function aiOrganize(text, title, kind, images = []) {
  if (canOrganize()) {
    const r = await api.organize({ text, title, kind, sections: S.sections.map((x) => x.name), images: images.filter((d) => /^data:image\/(jpeg|png|gif|webp);base64,/.test(d)).slice(0, 4) });
    if (r.ok) { try { return normalizeAI(r.result, text); } catch {} }
    else if (r.reason === 'error') toast({ title: 'AI 정리 대신 기본 규칙으로 정리했어요', body: r.error, ttl: 4500 });
  }
  return localResult(text, title);
}
function replyFor(r, added) {
  if (voiceFor()?.organized) {
    const e = added[0];
    const d = e && new Date(e.at);
    const alarm = e && `${fmtDate(d)} ${e.allDay ? '종일' : fmtTime(d)} ‘${e.title}’`;
    const reminders = e?.pre ? (e.pre % 60 === 0 ? `${e.pre / 60}시간` : `${e.pre}분`) : '';
    return voiceLine('organized', { keyword: r.keyword, alarm, reminders, count: added.length }, '');
  }
  if (r.reply) return r.reply;
  if (!added.length) return `'${r.keyword}'(으)로 정리해 뒀어요.`;
  const e = added[0], d = new Date(e.at);
  let s = `${fmtDate(d)} ${e.allDay ? '' : fmtTime(d) + ' '}'${e.title}' 알람을 맞췄어요!`;
  if (e.pre) s += ` ${e.pre >= 60 ? e.pre / 60 + '시간' : e.pre + '분'} 전에도 한 번 더 알려드릴게요.`;
  if (added.length > 1) s += ` (일정 ${added.length}개)`;
  return s;
}
function applyResult(n, r) {
  if (!n.kwManual || !memoTitle(n).trim()) { n.keyword = r.keyword; n.kwManual = false; }
  if (!n.kwManual && !n.title.trim() && r.title) n.title = r.title;
  if (r.summary.length) n.summary = r.summary;
  n.aiSource = r.src;
  if (!n.secManual) {
    if (r.section && r.src !== 'local') {
      const normalize = name => name.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
      const match = S.sections.find(s => normalize(s.name) === normalize(r.section));
      n.sectionId = (match || addSection(r.section)).id;
    } else if (!secIdOf(n)) n.sectionId = guessSection(n);
  }
  const added = []; for (const ev of r.events) { const e = addEvent(n, ev); if (e) added.push(e); }
  return added;
}
let organizing = new Set();
async function organizeNote(n, { auto }) {
  const text = n.text.trim();
  const usePhotos = canOrganize() && n.photos.length > 0;
  if (!text && !usePhotos) {
    if (!auto) {
      const message = n.photos.length ? '사진 속 글은 AI 연결이 있어야 읽을 수 있어요.' : '메모를 먼저 적어주세요!';
      if (openId === n.id && hasPremiumMemo()) perchSay(message, 4500);
      else toast({ title: message, ttl: 4500 });
    }
    return;
  }
  if (organizing.has(n.id)) return;
  organizing.add(n.id); setMood('think');
  const btn = !auto && $('#aiBtn'); if (btn) { btn.disabled = true; btn.replaceChildren(iel('sparkle', 16), '정리하는 중…'); }
  try {
    const requestedHash = noteHash(n);
    const r = await aiOrganize(text || '(글 없이 사진만 있는 메모)', n.title, 'memo', usePhotos ? n.photos : []);
    if (!byId(n.id)) return;
    if (requestedHash !== noteHash(n)) {
      if (S.settings.autoOrganize && openId !== n.id) queueMicrotask(() => organizeNote(n, { auto: true }));
      return;
    }
    const added = applyResult(n, r);
    n.orgHash = r.src === 'local' && canOrganize() ? '' : noteHash(n);
    save();
    if (openId === n.id) renderCard(n);
    renderTabs(); refreshAgenda();
    const msg = replyFor(r, added);
    setMood('talk', 2500);
    if (openId === n.id && hasPremiumMemo()) perchSay(msg, 5000);
    else if (openId === n.id) toast({ title: msg, ttl: 5000 });
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
  if (voiceFor()?.weather) {
    const snow = (code) => (code >= 71 && code <= 77) || code === 85 || code === 86;
    if (S.settings.character === 'basic-memoring' && !tm) {
      document.documentElement.classList.toggle('memoring-rain', /비|소나기/.test(WMO(r.now.code)));
    }
    return voiceLine('weather', {
      place: r.place, tomorrow: tm, temperature: `${rd(r.now.temp)}°C`, current: WMO(r.now.code),
      forecast: WMO(d.code), range: `${rd(d.min)}~${rd(d.max)}°C`, probability: d.pop,
      snow: snow(d.code) || (!tm && snow(r.now.code)), rain: d.pop >= 50 || (d.code >= 51 && d.code <= 67) || d.code >= 80,
      cold: d.max <= 3, hot: d.max >= 30,
    }, '');
  }
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
  if (/^(?:(?:오늘|AI)\s*)?(?:일정\s*)?브리핑(?:\s*(?:해\s*줘|해\s*주세요|부탁해))?[.!?]?$/i.test(text)) {
    say(briefing(), { briefingArt:true, ttl: 12000, menu: false });
    return;
  }
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

/* ─────────── 캐릭터(펫) ─────────── */
function setMood(m, ttl = 0) {
  clearTimeout(moodT);
  mood = m;
  const pr = $('#perch'); if (pr) { pr.className = pr.className.replace(/mood-\w+/, 'mood-' + mood); }
  if (ttl) moodT = setTimeout(() => setMood('idle'), ttl);
}
function toggleDock() {
  if (modalKind === 'board') { closeBoard(); return; }
  const shown = !$('#stage').classList.contains('dock-hidden');
  if (shown) {
    if (openId || bubble.open) closeAll();
    summoned = false; dockFolded = true;
  } else { dockFolded = false; summoned = true; }
  applyMode(); renderTabs(); setMood('talk', 700);
}
function toggleMenu() {
  if (bubble.open && bubble.menu) closeBubble(); else { openMenu(); api.focus(); }
}

/* 말풍선 */
function placeBubble() {
  const b = $('#bubble'), bw = b.offsetWidth, bh = b.offsetHeight;
  const anchor = bubble.anchor;
  const center = anchor ? anchor.x + anchor.width / 2 : S.settings.side === 'left' ? bw / 2 + 12 : W() - bw / 2 - 12;
  const x = clamp(center - bw / 2, 12, W() - bw - 12);
  const below = !!anchor && anchor.y < bh + 22;
  const y = !anchor ? H() - bh - 28 : below ? anchor.y + anchor.height + 10 : anchor.y - bh - 10;
  b.dataset.menu = String(bubble.menu);
  b.toggleAttribute('data-anchored', !!anchor);
  b.toggleAttribute('data-below', below);
  b.style.setProperty('--tail-x', clamp(center - x, 8, bw - 8) + 'px');
  b.style.left = x + 'px'; b.style.top = clamp(y, 12, H() - bh - 12) + 'px';
}
function say(msg, { ttl = 6000, menu, actions = [], anchor, briefingArt = false } = {}) {
  const b = $('#bubble');
  const keepMenu = menu ?? (bubble.open && bubble.menu);
  bubble = { open: true, menu: keepMenu, t: bubble.t, anchor: anchor || (keepMenu ? bubble.anchor : null) };
  b.dataset.speaker = petIdFor(S.settings.character) || "";
  b.dataset.menu = String(keepMenu);
  b.classList.toggle('briefing-art', briefingArt || keepMenu);
  b.replaceChildren(h('div', { class: 'who' }, C.charName(S)), h('div', { class: 'msg' }, msg));
  if (actions.length) b.append(h('div', { class: 'ask' }, actions.slice(0, 2).map((a) => h('button', { class: 'btn primary', type: 'button', onclick: () => { closeBubble(); a.run(); } }, a.label))));
  if (keepMenu) appendMenu(b);
  b.hidden = false; placeBubble(); updateHit();
  clearTimeout(bubble.t);
  if (ttl && !keepMenu) bubble.t = setTimeout(closeBubble, ttl);
}
function greeting() {
  const hr = new Date().getHours();
  const hi = hr < 11 ? '좋은 아침이에요!' : hr < 17 ? '무엇을 도와드릴까요?' : '오늘 하루 수고 많았어요!';
  return `${voiceLine('greeting', { hour: hr }, hi)} ${briefing()}`;
}
function openMenu(anchor) { say(greeting(), { menu: true, ttl: 0, anchor }); setTimeout(() => { const i = $('#askIn'); i && i.focus(); }, 60); }
function appendMenu(b) {
  const input = h('input', { id: 'askIn', type: 'text', placeholder: '비서에게 부탁하기…', 'aria-label': '비서에게 부탁하기',
    onkeydown: (e) => { if (e.key === 'Enter' && !e.isComposing && input.value.trim()) { askAssistant(input.value); input.value = ''; } } });
  b.append(
    h('div', { class: 'ask' }, input,
      h('button', { class: 'btn primary icon', type: 'button', 'aria-label': '보내기', onclick: () => { if (input.value.trim()) { askAssistant(input.value); input.value = ''; } }, html: ico('send', 16) })),
    h('div', { class: 'acts' },
      h('button', { type: 'button', onclick: () => { closeBubble(); openBoard(); } }, iel('board', 16), '전체보기 열기'),
      h('button', { type: 'button', onclick: () => { closeBubble(); newNote(); } }, iel('edit', 18), '새 메모'),
      h('button', { type: 'button', onclick: () => { closeBubble(); openSettings(); } }, iel('gear', 18), '비서 설정')));
}
function closeBubble() { clearTimeout(bubble.t); bubble = { open: false, menu: false, t: 0 }; $('#bubble').hidden = true; updateHit(); }

/* ─────────── 가장자리 미리보기 ─────────── */
let edgeT = 0, edgeSide = null;
const edgeKey = c => c.edge ? (c.displayId ?? '') + '/' + c.edge : null;
function recentNotes() { return S.notes.filter((n) => !isEmpty(n)).sort((a, b) => (b.viewedAt || b.createdAt) - (a.viewedAt || a.createdAt)).slice(0, 5); }
function canPeek() {
  return S.settings.peek && $('#stage').classList.contains('dock-hidden') && !openId && !modalOpen && !bubble.menu && !dragging;
}
function handleEdge(c) {
  if (!canPeek()) { clearTimeout(edgeT); edgeSide = null; return; }
  if (peek.open && !c.on && c.displayId !== undefined) closePeek();
  if (c.edge && !peek.open) {
    const el = c.on && document.elementFromPoint(c.edge === 'left' ? 1 : W() - 2, c.y);
    if (el && el.closest('.tab,.sheet')) return;
    const key = edgeKey(c);
    if (edgeSide !== key) {
      edgeSide = key; clearTimeout(edgeT);
      edgeT = setTimeout(async () => {
        if (edgeSide !== key || !canPeek()) return;
        if (!c.on && api.showPeekDisplay && !await api.showPeekDisplay(c.displayId, c.edge)) return;
        if (edgeSide === key && edgeKey(cursor) === key) openPeek(c.edge, cursor.y);
      }, +S.settings.peekDelay || 350);
    }
  } else if (!c.edge) { edgeSide = null; clearTimeout(edgeT); }
}
function openPeek(side, y) {
  if (!side || !canPeek()) return;
  peek.list = recentNotes(); peek.idx = 0; peek.side = side; peek.open = true;
  const el = $('#peek');
  el.className = 'peek ' + side;
  el.hidden = false;
  el.style.top = clamp(y - 150, 12, Math.max(12, H() - 380)) + 'px';
  renderPeek();
  requestAnimationFrame(() => { if (peek.open) { el.classList.add('open'); updateHit(); } });
}
function renderPeek() {
  const el = $('#peek'), n = peek.list[peek.idx];
  const charBox = h('div', { class: 'pc', title: '우클릭으로 미리보기 닫기',
    html: C.charHTML(S.settings.character, S.settings.customChar), oncontextmenu: (e) => { e.preventDefault(); dismissPeek(); } });
  const close = h('button', { class: 'peek-close', type: 'button', 'aria-label': '미리보기 닫기', title: '닫기', onclick: (event) => { event.stopPropagation(); dismissPeek(); }, html: ico('x', 14) });
  if (!n) {
    el.replaceChildren(h('div', { class: 'pcard' }, close, charBox, h('div', { class: 'pk' }, '메모가 없어요'), h('div', { class: 'pt' }, '저를 눌러서 첫 메모를 적어보세요.')));
    return;
  }
  const t = TH(n.theme);
  const body = n.text.split('\n').filter(Boolean).slice(0, 6).join('\n');
  const pp = paperOf(n);
  el.replaceChildren(h('div', { class: 'pcard', style: pp ? `--pf:${pp.bg};--ps:${pp.tab};--ph:${pp.tab};--pr:#00000014` : `--pf:${t.fill};--ps:${t.stroke};--ph:${t.hl};--pr:${t.rule}`, onclick: () => openNote(n.id), title: '눌러서 메모 열기' },
    close, charBox,
    h('div', { class: 'psec', style: `--tc:${secColor(secOf(n)).bg};--ti:${secColor(secOf(n)).ink}` }, secOf(n).name),
    h('div', { class: 'pk' }, memoTitle(n) || '메모'),
    h('div', { class: 'pt' }, body || '(내용 없음)'),
    n.photos.length ? h('div', { class: 'pph' }, n.photos.slice(0, 3).map((src) => h('img', { src: /^data:image\//.test(src) ? src : '', alt: '' }))) : null,
    h('div', { class: 'pf' }, h('span', {}, peek.list.length > 1 ? '휠로 넘겨보기 · 눌러서 열기' : '눌러서 열기'),
      h('span', { class: 'dots' }, peek.list.map((_, i) => h('i', { class: i === peek.idx ? 'on' : '' }))))));
  el.querySelector('.pc').classList.add('mood-idle');
}
function closePeek() {
  clearTimeout(edgeT);
  edgeSide = null;
  peek.open = false;
  const el = $('#peek');
  el.classList.remove('open');
  el.hidden = true;
  updateHit();
}
function dismissPeek() {
  closePeek();
  edgeSide = edgeKey(cursor);
}
$('#peek').addEventListener('wheel', (e) => { if (peek.list.length < 2) return; e.preventDefault(); peek.idx = (peek.idx + (e.deltaY > 0 ? 1 : -1) + peek.list.length) % peek.list.length; renderPeek(); }, { passive: false });

/* ─────────── 일정 정리 화면 ─────────── */
function refreshAgenda() {
  $('#overview-schedule')?.replaceWith(overviewSchedule());
}
function scheduleRow(n, e) {
  const t = TH(n.theme).tab;
  return h('div', { class: 'arow' + (e.done ? ' done' : '') },
    h('button', { class: 'ck', type: 'button', 'aria-label': e.done ? '완료 취소' : '완료', onclick: () => {
      e.done = !e.done; e.doneAt = e.done ? Date.now() : null; save(); refreshAgenda(); renderTabs();
      const line = e.done && voiceLine('completed', { count: todayEvents().length }, '');
      if (line) toast({ title: line, theme: n.theme, ttl: 4500 });
    }, html: ico('check', 14) }),
    h('div', { class: 'ab' },
      h('button', { class: 'at', type: 'button', title: e.title, onclick: () => openNote(n.id) }, (e.deadline ? '[마감] ' : '') + e.title),
      h('div', { class: 'am' },
        h('span', {}, e.allDay ? '종일' : fmtTime(new Date(e.at))),
        h('span', { class: 'kwchip', style: `background:${t.bg};color:${t.ink}` }, memoTitle(n) || '메모'),
        h('select', { class: 'rep', 'aria-label': '반복', onchange: (ev) => { e.repeat = ev.target.value; save(); } },
          [['none', '한 번'], ['daily', '매일'], ['weekly', '매주']].map(([v, l]) => h('option', { value: v, selected: e.repeat === v }, l))),
        h('select', { class: 'rep', 'aria-label': '미리 알림', title: '미리 알림', onchange: (ev) => { e.pre = +ev.target.value; e.preFired = false; save(); } },
          [[0, '미리 알림 없음'], [10, '10분 전'], [30, '30분 전'], [60, '1시간 전'], [180, '3시간 전'], [1440, '하루 전']].map(([v, l]) => h('option', { value: v, selected: e.pre === v }, l))),
        h('button', { class: 'ib' + (e.alarm ? ' on' : ''), type: 'button', 'aria-label': '알람 켜기/끄기', title: e.alarm ? '알람 끄기' : '알람 켜기', onclick: () => { e.alarm = !e.alarm; if (e.alarm && e.at > Date.now()) { e.fired = false; e.preFired = false; } save(); refreshAgenda(); renderTabs(); }, html: ico('bell', 15) }),
        h('button', { class: 'ib', type: 'button', 'aria-label': '일정 삭제', title: '일정 삭제', onclick: () => { n.events = n.events.filter((x) => x !== e); save(); refreshAgenda(); renderTabs(); }, html: ico('trash', 15) }))));
}
function rescan() {
  let added = 0; for (const n of S.notes) for (const c of P.parseEvents([n.title, n.text].filter(Boolean).join('\n'))) if (addEvent(n, c)) added++;
  save(); refreshAgenda(); renderTabs();
  toast({ title: added ? `일정 ${added}개를 새로 찾았어요` : '새로 찾은 일정이 없어요', ttl: 2600 });
}
function demoAlarm() {
  let n = (openId && byId(openId)) || S.notes[0];
  if (!n) { n = blankNote(); n.keyword = '체험'; S.notes.unshift(n); }
  const e = addEvent(n, { title: '알람 체험: 이렇게 알려드려요', at: Date.now() + 5000 }); if (e) e.pre = 0;
  save(); refreshAgenda(); renderTabs();
  toast({ title: '5초 뒤에 알람이 울려요', body: '화면 아래에 알람이 떠요.', theme: n.theme, ttl: 3000 });
}

/* ─────────── 설정 ─────────── */
async function openSettings() {
  if (modalKind === 'board') closeBoard();
  closePeek(); closeBubble();
  keys = await api.keyStatus();
  modalOpen = true; modalKind = 'settings'; updateHit(); api.focus();
  const m = $('#modal'); m.hidden = false;
  const st = S.settings;
  const notionPanel = h('div',{});
  if (api.notion) {
    const state=await api.notion('status');
    const link=h('input',{type:'url',placeholder:'앨범 페이지 링크','aria-label':'노션 앨범 페이지 링크'});
    const token=h('input',{type:'password',placeholder:'노션 API 토큰',autocomplete:'off','aria-label':'노션 API 토큰'});
    const label=h('p',{class:'note',role:'status'},state.connected?'앨범 연결됨':'개인 앨범 페이지에 PeeKit 연결을 추가하세요.');
    const button=h('button',{class:'btn',type:'button',onclick:async()=>{
      button.disabled=true;
      try {
        const r=await api.notion(state.connected?'clear':'connect',{link:link.value,token:token.value});
        if (r.ok) {state.connected=r.connected;token.value='';link.hidden=token.hidden=state.connected;}
        label.textContent=r.ok?(state.connected?'앨범 연결됨':'연결 해제됨'):r.error;
        button.textContent=state.connected?'연결 해제':'앨범 연결';
      } finally {button.disabled=false;}
    }},state.connected?'연결 해제':'앨범 연결');
    link.hidden=token.hidden=state.connected;
    notionPanel.append(h('h4',{},'노션 앨범'),link,token,button,label);
  }
  let calendarState = await api.calendar?.('status');
  let calendarBusy = false;
  const calendarAction = async action => {
    calendarBusy = true; render();
    try { calendarState = await api.calendar(action); }
    catch { calendarState = { ...calendarState, error:'캘린더에 연결할 수 없어요.' }; }
    finally { calendarBusy = false; if (modalKind === 'settings') render(); }
  };
  let petVisible = await api.petVisible?.();
  let characterBusy = false;
  const chooseCharacter = async (id, image) => {
    if (characterBusy) return;
    characterBusy = true;
    try {
      const makePet = api.petControls && image && hasPremiumMemo();
      const petId = image ? null : petIdFor(id);
      if (api.petControls && (makePet || petId)) {
        render();
        const state = await refreshPetControls(makePet ? 'photo' : 'show', makePet ? image : petId);
        if (!state) return;
        const selected = state.species.find((item) => item.selected);
        if (makePet ? !selected?.id.startsWith('image-') : selected?.id !== petId) {
          toast({ title: '선택한 펫을 불러오지 못했어요', ttl: 3500 });
          return;
        }
        if (makePet) st.customPetId = selected.id;
        petVisible = state.present;
      }
      if (image) {
        st.customChar = image;
        if (!makePet) delete st.customPetId;
        maker = null;
      }
      selectCharacter(id);
      save();
    } finally {
      characterBusy = false;
      render();
    }
  };
  const settingLabels = { side: '책갈피 위치', modeOverride: '표시 방식', peek: '가장자리 미리보기', peekDelay: '미리보기 속도', petSize: '펫 크기', noteFontSize: '메모 글자 크기', proPreview: 'Pro 미리보기', autoOrganize: '메모를 접으면 자동 정리', preDeadline: '마감 미리 알림', preNormal: '일정 미리 알림', morningBrief: '아침 브리핑', petScheduleBrief: '펫 일정 안내', launchAtLogin: '컴퓨터 켤 때 실행' };
  const settingControl = (key, opts, after) => {
    const label = settingLabels[key];
    const update = value => { st[key] = value; save(); after?.(); };
    if (typeof opts[0][0] === 'boolean') {
      return h('button', { class: 'setting-switch', type: 'button', role: 'switch', 'aria-label': label,
        'aria-checked': String(st[key]), onclick: e => {
          update(!st[key]); e.currentTarget.setAttribute('aria-checked', String(st[key]));
        } });
    }
    if (typeof opts[0][0] === 'number') {
      const index = Math.max(0, opts.findIndex(([value]) => value === st[key]));
      const output = h('span', { class: 'range-value' }, opts[index][1]);
      return h('div', { class: 'setting-range' }, h('input', { type: 'range', min: 0, max: opts.length - 1,
        value: index, 'aria-label': label, 'aria-valuetext': opts[index][1], oninput: e => {
          const [value, text] = opts[Number(e.target.value)];
          output.textContent = text; e.target.setAttribute('aria-valuetext', text); update(value);
        } }), output);
    }
    return h('select', { 'aria-label': label, onchange: e => update(e.target.value) },
      opts.map(([value, text]) => h('option', { value, selected: value === st[key] }, text)));
  };
  async function resetSettings() {
    if (characterBusy) return;
    for (const key of [...Object.keys(settingLabels), 'petName', 'weatherCity', 'letterDay', 'letterTime']) st[key] = DEFAULTS[key];
    dockFolded = false;
    applyNoteFont(); api.applySettings({ petSize: st.petSize, launchAtLogin: st.launchAtLogin, modeOverride: st.modeOverride, proPreview: st.proPreview });
    applySide(); applyMode(); queuePerch();
    await chooseCharacter(DEFAULTS.character);
    refreshOpenCards();
    save(); render();
  }
  const keyMsg = {};
  const testKey = async (name) => {
    keyMsg[name] = { t: '연결 확인 중…', ok: null }; render();
    const r = api.testKey ? await api.testKey(name) : { ok: keys[name] };
    keyMsg[name] = r.ok ? { t: '연결을 확인했어요.', ok: true } : { t: r.error || '키를 확인하지 못했어요', ok: false };
    render();
  };
  const keyRow = (name, label, ph, help) => {
    const inp = h('input', { type: 'password', id: 'key-' + name, autocomplete: 'off', spellcheck: 'false', placeholder: keys[name] ? '저장됨 · 바꾸려면 새 키를 붙여넣기' : ph, 'aria-label': label });
    const saveKey = async () => {
      const v = inp.value.trim();
      if (!v) { keyMsg[name] = { t: '값을 입력한 뒤 저장을 눌러주세요.', ok: false }; render(); return; }
      keys = await api.setKey(name, v); await testKey(name);
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveKey(); });
    const msg = keyMsg[name];
    return h('div', { class: 'keybox' },
      h('div', { class: 'row' }, h('label', { for: 'key-' + name, style: 'min-width:120px' }, label), inp,
        h('button', { class: 'btn primary', type: 'button', onclick: saveKey }, '저장'),
        keys[name] ? h('button', { class: 'btn', type: 'button', onclick: () => testKey(name) }, '연결 확인') : null,
        keys[name] ? h('button', { class: 'btn', type: 'button', onclick: async () => { keys = await api.setKey(name, ''); keyMsg[name] = { t: '연결 정보를 지웠어요.', ok: null }; render(); } }, '지우기') : null),
      h('div', { class: 'keystate ' + (msg ? (msg.ok ? 'good' : msg.ok === false ? 'bad' : '') : keys[name] ? 'good' : '') },
        msg ? msg.t : keys[name] ? '저장된 키가 있어요.' : help));
  };
  const builtinAI = () => h('div', { class: 'keybox' },
    h('div', { class: 'keystate ' + (keys.anthropic ? 'good' : 'bad') }, keys.anthropic ? 'Claude: 키 없이 바로 연결돼요 (지금 로그인한 Claude 계정 사용). 처음 쓸 때 허용을 물어봐요.' : 'Claude: 이 화면에서는 연결할 수 없어요. claude.ai에서 열어주세요.'),
    h('p', { class: 'note' }, '웹 미리보기는 보안 규칙 때문에 직접 넣은 API 키를 Claude 서버로 보낼 수 없어요. 내 Claude 키는 컴퓨터에 설치하는 데스크톱 앱의 설정에서 넣어요.'));
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
      h('button', { class: 'btn primary', type: 'button', disabled: maker.busy || characterBusy || !maker.result, onclick: () => chooseCharacter('custom', maker.result) }, '이 캐릭터로 정하기'),
      h('button', { class: 'btn', type: 'button', onclick: () => { maker = null; render(); } }, '취소')));
  const armedDel = {};
  const secManager = () => h('div', { class: 'secman' },
    S.sections.map((x) => h('div', { class: 'row' },
      h('input', { type: 'text', value: x.name, maxlength: '10', 'aria-label': '섹션 이름', style: 'flex:0 1 150px;min-width:90px', onchange: (e) => { x.name = e.target.value.trim() || x.name; save(); renderTabs(); } }),
      h('span', { class: 'secsw' }, sectionPalette().map((c, i) => h('button', { type: 'button', class: 'sw', 'aria-label': `색 ${i + 1}`, 'aria-pressed': String((x.color || 0) % SEC_COLORS.length === i), style: `background:${c.bg}`, onclick: () => { x.color = i; save(); renderTabs(); render(); } }))),
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
    if (m.hidden || modalKind !== 'settings') return;
    const panelScroll = m.querySelector('.panel')?.scrollTop || 0;
    const panel = h('div', { class: 'panel settings-panel', role: 'dialog', 'aria-label': '설정' },
      h('header', { class: 'settings-head' }, h('h3', {}, '설정'), h('button', { class: 'btn', type: 'button', disabled: characterBusy, onclick: resetSettings }, '기본값으로'), h('button', { class: 'btn icon', type: 'button', 'aria-label': '닫기', onclick: closeSettings, html: ico('x', 16) })),
      h('p', { class: 'note settings-intro' }, '추천 기본값이 맞춰져 있어요. 필요한 것만 바꾸세요.'),
      h('h4', {}, 'AI 비서 · 데스크톱 펫'),
      h('div', { class: 'chars' },
        C.ORDER.map((id) => h('button', { type: 'button', disabled: characterBusy, 'aria-pressed': String(st.character === id), onclick: () => chooseCharacter(id) },
          h('span', { class: 'cv', html: C.charHTML(id) }), C.CHARS[id].name)),
        filePicker({ cls: 'charpick' + (st.character === 'custom' ? ' on' : ''), label: '내 이미지로 캐릭터 만들기', multiple: false, onFiles: pickChar },
          h('span', { class: 'cv', html: st.customChar ? C.charHTML('custom', st.customChar) : ico('image', 26) }), st.customChar ? '내 사진 바꾸기' : '내 사진으로')),
      makerUI(),
      h('p', { class: 'note' }, '캐릭터를 고르면 메모 테마도 함께 바뀌어요.'),
      voiceFor()?.description ? h('p', { class: 'note' }, voiceFor().description) : null,
      h('div', { class: 'row' }, h('label', {}, '이름'), h('input', { type: 'text', maxlength: '8', value: st.petName, placeholder: C.character(st.character).name, oninput: (e) => { st.petName = e.target.value; save(); } })),
      h('h4', {}, '화면'),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '책갈피 위치'), settingControl('side', [['left', '왼쪽'], ['right', '오른쪽']], applySide)),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '표시 방식'), settingControl('modeOverride', [['auto', '펫에서 열기'], ['desktop', '책갈피 표시']], () => {
        dockFolded = false; api.applySettings({ modeOverride: st.modeOverride }); applyMode();
      })),
      h('p', { class: 'note' }, '우클릭하면 책갈피가 열리고 닫혀요. 오른쪽 버튼을 1.2초 누르면 오늘 브리핑을 볼 수 있어요.'),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '가장자리 미리보기'), settingControl('peek', [[true, '켜기'], [false, '끄기']])),
      h('div', { class: 'row' }, h('label', {}, '미리보기 속도'), settingControl('peekDelay', [[200, '빠르게'], [350, '보통'], [600, '천천히']])),
      h('div', { class: 'row' }, h('label', {}, '펫 크기'), settingControl('petSize', [56, 64, 72, 80, 88, 96, 112, 128].map((size) => [size, size + 'px']), () => { applyNoteFont(); api.applySettings({ petSize: st.petSize }); queuePerch(); })),
      h('div', { class: 'row' }, h('label', {}, '메모 글자 크기'), settingControl('noteFontSize', [12, 14, 15, 16, 18, 20, 24].map(size => [size, size + 'px']), applyNoteFont)),
      api.petVisible ? h('div', { class: 'row' }, h('label', {}, '움직이는 데스크톱 펫'),
        h('button', { type: 'button', class: 'setting-switch', role: 'switch', 'aria-label': '움직이는 데스크톱 펫', 'aria-checked': String(petVisible === true), onclick: async () => {
          if (await api.petVisible()) {
            petVisible = await api.petVisible(false);
          } else {
            const state = await refreshPetControls('show', petIdFor(st.character));
            petVisible = state?.present ?? false;
          }
          render();
        } })) : null,
      info.proPreview ? h('div', { class: 'row' }, h('label', {}, 'Pro 미리보기'),
        settingControl('proPreview', [[false, '기본 메모'], [true, 'Pro']], () => {
          api.applySettings({ proPreview: st.proPreview });
          refreshOpenCards();
        })) : null,
      h('h4', {}, '섹션 (큰 책갈피)'),
      secManager(),
      api.calendar ? [
        h('h4', {}, 'Google 캘린더'),
        h('div', { class:'row' },
          h('button', {class:'btn',type:'button',disabled:calendarBusy,
            onclick:() => calendarAction(calendarState?.connected ? 'today' : 'connect')},
            calendarBusy ? '연결 확인 중…' : calendarState?.connected ? '오늘 일정 보기' : 'Google 캘린더 연결'),
          calendarState?.connected ? h('button',{class:'btn',type:'button',disabled:calendarBusy,
            onclick:() => calendarAction('disconnect')},'연결 해제') : null),
        calendarState?.error ? h('p',{class:'note',role:'status'},calendarState.error) : null,
        calendarState?.events ? (calendarState.events.length ? h('ul',{},calendarState.events.map(e =>
          h('li',{},(e.allDay ? '종일' : new Date(e.start).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}))+' · '+e.title))) :
          h('p',{class:'note'},'오늘은 등록된 일정이 없어요.')) : null,
      ] : null,
      h('h4', {}, '주간 편지'),
      h('div', { class:'row' }, h('label', { for:'letter-day' }, '받는 요일'),
        h('select', { id:'letter-day', onchange:e => { st.letterDay = Number(e.target.value); S.lettersSince = Date.now(); save(); } },
          Array.from('일월화수목금토', (day, i) => h('option', {value:i, selected:i === st.letterDay}, day+'요일')))),
      h('div', { class:'row' }, h('label', { for:'letter-time' }, '받는 시간'),
        h('input', { id:'letter-time', type:'time', value:st.letterTime, onchange:e => {
          if (!e.target.value) { e.target.value = st.letterTime; return; }
          st.letterTime = e.target.value; S.lettersSince = Date.now(); save();
        } })),
      h('h4', {}, '날씨'),
      keyRow('kma','기상청 인증키','공공데이터포털 단기예보 인증키',keys.direct ? '앱을 종료하면 입력한 키가 지워져요.' : '이 컴퓨터에서 사용할 기상청 단기예보 인증키를 입력하세요.'),
      h('p', {class:'note'}, '자료 제공: 기상청 단기예보 · 지역의 도시 이름을 입력하세요.'),
      h('div', { class: 'row' }, h('label', { for: 'wcity', style: 'min-width:96px' }, '지역'),
        h('input', { type: 'text', id: 'wcity', maxlength: '20', value: st.weatherCity, placeholder: '예: 서울, 부산, 제주', onchange: (e) => { st.weatherCity = e.target.value.trim() || '서울'; save(); } }),
        h('button', { class: 'btn', type: 'button', onclick: () => { closeSettings(); askWeather('오늘 날씨'); } }, '지금 날씨 묻기')),
      h('h4', {}, '자동 정리 · 알람'),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '메모를 접으면 자동 정리'), settingControl('autoOrganize', [[true, '메모를 접으면 자동으로'], [false, '버튼 누를 때만']])),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '마감 미리 알림'), settingControl('preDeadline', [[0, '없음'], [30, '30분 전'], [60, '1시간 전'], [180, '3시간 전'], [1440, '하루 전']])),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '일정 미리 알림'), settingControl('preNormal', [[0, '없음'], [10, '10분 전'], [30, '30분 전'], [60, '1시간 전']])),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '아침 브리핑'), settingControl('morningBrief', [[true, '켜기'], [false, '끄기']])),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '펫 일정 안내'), settingControl('petScheduleBrief', [[true, '켜기'], [false, '끄기']])),
      api.notion ? notionPanel : null,
      h('h4', {}, 'AI 연결'),
      keys.builtin ? builtinAI() : [
        keyRow('openai','OpenAI API 키','OpenAI 키 붙여넣기',keys.direct ? '앱을 종료하면 입력한 키가 지워져요.' : '키를 등록하면 메모 정리와 병합에 우선 사용하며 요금은 본인 OpenAI 계정에 청구돼요.'),
        !keys.direct && keyRow('hosted', 'AI 이용 코드', '발급받은 이용 코드', '메모와 첨부 사진을 운영 서버를 통해 OpenAI로 보내 정리해요. 사용자당 매월 1달러까지 이용할 수 있어요.'),
        keyRow('anthropic', 'Claude API 키', 'sk-ant-로 시작하는 키 붙여넣기', '메모 정리·사진 속 일정 읽기·부탁하기에 써요. 없으면 기본 규칙으로 정리해요.'),
        h('p', { class: 'note' }, keys.direct ? '직접 테스트에서는 운영 서버의 사용자별 월 한도가 적용되지 않아요.' : '키를 저장하면 연결을 확인해요.')],
      h('h4', {}, '기타'),
      h('div', { class: 'row' }, h('label', { style: 'min-width:96px' }, '컴퓨터 켤 때 실행'), settingControl('launchAtLogin', [[true, '켜기'], [false, '끄기']], () => api.applySettings({ launchAtLogin: st.launchAtLogin }))),
      h('div', { class: 'row' },
        h('button', { class: 'btn', type: 'button', onclick: () => api.openData() }, '데이터 폴더 열기'),
        h('button', { class: 'btn', type: 'button', onclick: () => api.quit() }, '앱 종료')),
      h('p', { class: 'note' }, '단축키: Ctrl/⌘ + Shift + M 책갈피 펼치기'));
    m.replaceChildren(panel);
    panel.scrollTop = panelScroll;
  }
  m.onpointerdown = (e) => { if (e.target === m) closeSettings(); };
  render();
}
function closeSettings() { modalOpen = false; modalKind = ''; $('#modal').hidden = true; $('#modal').replaceChildren(); renderTabs(); applyMode(); updateHit(); }

/* ─────────── 메모 모아보기 (항상 위 위젯 + 전체 보드) ─────────── */
let boardFilter = 'all';
let overviewDay;
const overviewSelected = new Set();
let overviewSelecting = false;
let overviewQuery = '';
let overviewAiSearch = null;
let overviewPinnedOnly = false;
let overviewEditing = false;
const overviewCardLabels = {
  assistant: '오늘',
  schedule: '이번 주 일정',
  memos: '메모 모아보기',
  ai: 'AI 정리',
  trash: '휴지통',
};

function normalizeOverviewLayout(saved) {
  const ids = Object.keys(overviewCardLabels);
  const layout = [];
  if (Array.isArray(saved)) {
    for (const item of saved) {
      if (!item || !ids.includes(item.id) || layout.some((card) => card.id === item.id)) continue;
      layout.push({ id: item.id, hidden: item.hidden === true });
    }
  }
  for (const id of ids) {
    if (!layout.some((card) => card.id === id)) layout.push({ id, hidden: false });
  }
  return layout;
}

const mergeReview = { busy: false, message: '', pairs: [], run: 0 };
function mergeSource(note) { return [memoTitle(note), note.text]; }
async function findMergeCandidates() {
  if (mergeReview.busy) return;
  const chosen = overviewSelected.size > 0;
  const notes = S.notes.filter(n => (!chosen || overviewSelected.has(n.id)) && (n.text.trim() || n.title.trim()));
  if (notes.length < 2) { toast({ title: '본문이나 제목이 있는 메모를 두 개 이상 골라 주세요.' }); return; }
  const rows = notes.map(n => ({ id: n.id, section: n.sectionId || '', source: mergeSource(n) }));
  rows.sort((a,b) => a.section.localeCompare(b.section) || a.source[0].localeCompare(b.source[0], 'ko'));
  const run = ++mergeReview.run;
  Object.assign(mergeReview, { busy: true, message: '비슷한 메모를 찾고 있어요…', pairs: [] });
  renderBoard();
  const seen = new Set();
  try {
    // Overlap adjacent windows so a boundary does not split neighboring notes.
    for (let start = 0; start < rows.length - 1; start += 28) {
      const batch = rows.slice(start, start + 32);
      const r = await api.mergeCandidates(batch.map(({ source: [title, text] }) => ({
        title: title.slice(0, 100), text: text.slice(0, 600),
      })));
      if (mergeReview.run !== run) return;
      if (!r.ok) throw Error(r.error || '병합 후보를 확인하지 못했어요.');
      for (const p of window.MemoMerge.pairs(r.result.pairs, batch.length)) {
        const items = [batch[p.first], batch[p.second]];
        if (items.some(item => seen.has(item.id))) continue;
        items.forEach(item => seen.add(item.id));
        mergeReview.pairs.push({ title: p.title.trim().slice(0, 80), items });
      }
      if (start + batch.length === rows.length) break;
    }
    mergeReview.message = mergeReview.pairs.length ? '내용을 확인하고 합칠 메모를 선택하세요.' : '합칠 만한 중복 메모를 찾지 못했어요.';
  } catch (e) { if (mergeReview.run === run) mergeReview.message = e.message; }
  finally {
    if (mergeReview.run === run) {
      mergeReview.busy = false;
      if (modalKind === 'board') renderBoard();
    }
  }
}
function currentMergeNotes(pair) {
  const notes = pair.items.map(item => byId(item.id));
  return notes.every((n,i) => n && !organizing.has(n.id) &&
    mergeSource(n).every((value,k) => value === pair.items[i].source[k])) ? notes : null;
}
function applyMerge(pair) {
  const notes = currentMergeNotes(pair);
  if (!notes || notes.some(n => n.id === openId || parkedSheets.has(n.id))) {
    toast({ title: '메모가 바뀌었어요. 다시 찾아 주세요.' }); return;
  }
  const draft = window.MemoMerge.draft(notes, pair.title);
  if (draft.photos.length > MAX_PHOTOS) return;
  const merged = Object.assign(blankNote(draft.sectionId), draft);
  merged.keyword = merged.title;
  merged.summary = P.summarize(merged.text);
  merged.orgHash = noteHash(merged);
  const removedAt = Date.now();
  S.notes = [merged, ...S.notes.filter(n => !notes.includes(n))];
  for (const note of notes) {
    S.trash.unshift({ note, removedAt });
    overviewSelected.delete(note.id);
  }
  mergeReview.pairs = mergeReview.pairs.filter(p => p !== pair);
  mergeReview.message = '합친 원본 메모는 휴지통에서 복원할 수 있어요.';
  save(); renderTabs(); renderBoard(); refreshAgenda();
}
function mergeControls(total) {
  if (!api.mergeCandidates || total < 2) return null;
  return h('div', { class: 'overview-merge' },
    total >= 20 && !mergeReview.message ? h('p', {}, '메모가 20개 이상 쌓였어요. 중복된 내용을 정리할까요?') : null,
    h('button', { class: 'btn', id: 'overview-merge-find', type: 'button', disabled: mergeReview.busy,
      onclick: () => (keys.hosted || keys.openai) ? findMergeCandidates() : toast({ title: '설정 → AI 연결에서 AI 이용 코드를 등록해 주세요.' }) },
      overviewSelected.size ? '선택한 메모에서 병합 후보 찾기' : '비슷한 메모 찾기'),
    h('p', { role: 'status', class: 'overview-muted' }, mergeReview.message),
    mergeReview.pairs.map(pair => {
      const notes = currentMergeNotes(pair);
      if (!notes) return h('p', {}, '변경된 메모가 있어요. 다시 찾아 주세요.');
      const draft = window.MemoMerge.draft(notes, pair.title);
      return h('details', {}, h('summary', {}, pair.title),
        h('ul', {}, notes.map(n => h('li', {}, memoTitle(n) || n.text.slice(0, 40)))),
        h('p', { style: 'white-space:pre-wrap' }, draft.text),
        h('p', {}, '사진 ' + draft.photos.length + '장 · 일정 ' + draft.events.length + '개 · ' + secOf(notes[0]).name),
        draft.photos.length > MAX_PHOTOS ? h('p', {}, '사진이 너무 많아 하나로 합칠 수 없어요.') :
          h('button', { class: 'btn', type: 'button', onclick: () => applyMerge(pair) }, '합치고 원본 2개 휴지통으로'));
    }));
}
let viewingTrash = false;
function openBoard(filter) {
  letterView = false;
  viewingTrash = false;
  overviewDay = startOfDay(new Date());
  if (openId) closeAll();
  closePeek(); closeBubble();
  if (filter !== undefined) boardFilter = filter;
  if (boardFilter !== 'all' && boardFilter !== '' && !secById(boardFilter)) boardFilter = 'all';
  modalOpen = true; modalKind = 'board'; updateHit(); api.focus();
  summoned = true;
  const m = $('#modal'); m.onpointerdown = null; m.hidden = false; m.classList.add('boardwrap');
  $('#stage').classList.add('overview-open');
  renderTabs();
  applyMode();
  renderBoard();
  updateHit();
  $('.overview-close')?.focus({ preventScroll: true });
}
function closeBoard() {
  ++mergeReview.run;
  Object.assign(mergeReview, { busy: false, message: '', pairs: [] });
  overviewEditing = false;
  overviewAiSearch = null;
  modalOpen = false; modalKind = '';
  const m = $('#modal'); m.hidden = true; m.classList.remove('boardwrap'); m.replaceChildren(); m.onpointerdown = null;
  $('#stage').classList.remove('overview-open');
  renderTabs();
  applyMode();
  $('.overview-tab')?.focus({ preventScroll: true });
  updateHit();
}

function overviewLayoutEditor(layout) {
  const update = (id, action) => {
    const index = layout.findIndex((card) => card.id === id);
    if (action === 'visibility') {
      layout[index].hidden = !layout[index].hidden;
    } else {
      const targetIndex = index + (action === 'up' ? -1 : 1);
      if (targetIndex < 0 || targetIndex >= layout.length) return;
      [layout[index], layout[targetIndex]] = [layout[targetIndex], layout[index]];
    }
    save();
    renderBoard();
    const row = $(`[data-layout-card="${id}"]`);
    const button = row?.querySelector(`[data-layout-action="${action}"]:not(:disabled)`);
    (button || row?.querySelector('[data-layout-action="visibility"]'))?.focus({ preventScroll: true });
  };
  return h('section', { id: 'overview-layout-editor', class: 'overview-card overview-layout-editor', 'aria-label': '위젯 편집' },
    h('p', { class: 'overview-muted' }, '위젯 순서를 바꾸거나 숨긴 위젯을 다시 표시할 수 있어요.'),
    h('ul', {}, layout.map(({ id, hidden }, index) => {
      const label = overviewCardLabels[id];
      const control = (action, value, disabled = false) => h('button', {
        class: 'overview-link', type: 'button', disabled, 'data-layout-action': action,
        'aria-label': `${label} ${value}`, onclick: () => update(id, action),
      }, value);
      return h('li', { 'data-layout-card': id },
        h('span', {}, label), control('up', '위로', index === 0), control('down', '아래로', index === layout.length - 1),
        control('visibility', hidden ? '표시' : '숨기기'));
    })));
}
const boardHash = () => S.settings.character + "|" + S.notes.map((n) => n.id + noteHash(n) + secIdOf(n)).join('|');
function boardOverview() {
  const notes = S.notes.filter((n) => !isEmpty(n)), now = Date.now(), lines = [];
  const today = todayEvents();
  lines.push(today.length ? `오늘 할 일 ${today.length}개: ${today.slice(0, 3).map((x) => `${fmtTime(new Date(x.e.at))} ${x.e.title}`).join(', ')}${today.length > 3 ? ' 외' : ''}` : '오늘 잡힌 일정은 없어요.');
  const dls = []; S.notes.forEach((n) => n.events.forEach((e) => { if (e.deadline && !e.done && e.at > now) dls.push(e); })); dls.sort((a, b) => a.at - b.at);
  if (dls.length) lines.push(`다가오는 마감: ${dls.slice(0, 3).map((e) => `${e.title} (${fmtWhen(e.at)})`).join(', ')}`);
  for (const x of [...S.sections, INBOX]) { const l = notesIn(x.id).filter((n) => !isEmpty(n)); if (l.length) lines.push(`[${x.name}] ${l.length}개 · ${l.slice(0, 4).map((n) => memoTitle(n) || '메모').join(', ')}${l.length > 4 ? ' …' : ''}`); }
  return { head: voiceLine('noteSummary', { notes: notes.length, sections: S.sections.length }, `메모 ${notes.length}개가 섹션 ${S.sections.length}개에 정리돼 있어요.`), lines };
}
async function aiBoardSummary(btn) {
  btn.disabled = true; btn.replaceChildren(iel('sparkle', 14), '요약하는 중…'); setMood('think');
  const notes = S.notes.filter((n) => !isEmpty(n)).map((n) => ({ section: secOf(n).name, keyword: n.keyword, title: n.title, text: n.text.slice(0, 600),
    events: n.events.filter((e) => !e.done).map((e) => `${fmtDate(new Date(e.at))} ${fmtTime(new Date(e.at))} ${e.title}${e.deadline ? ' (마감)' : ''}`) }));
  const hash = boardHash();
  const voice = voiceFor()?.description || "";
  const r = keys.anthropic && api.summarize ? await api.summarize({ notes, voice }).catch(() => ({ ok: false })) : { ok: false, reason: 'nokey' };
  if (r.ok && r.text && hash !== boardHash()) { setMood('idle'); return; }
  if (r.ok && r.text) { S.boardAI = { hash, text: r.text.trim(), at: Date.now() }; save(); }
  else toast({ title: r.reason === 'nokey' ? 'AI 요약에는 Claude 연결이 필요해요' : 'AI 요약을 하지 못했어요', body: r.error || (r.reason === 'nokey' ? '설정 → AI 연결을 확인해 주세요. 지금은 기본 요약을 보여드려요.' : ''), ttl: 5000 });
  setMood('idle'); if (modalKind === 'board') renderBoard();
}
function boardNote(n) {
  const title = memoTitle(n) || n.text.trim().split('\n')[0] || '새 메모';
  const excerpt = n.text.trim().replace(/\s+/g, ' ');
  const toggle = overviewSelecting ? h('button', { class: 'overview-select', type: 'button', 'aria-label': `${title} AI 정리 선택`, 'aria-pressed': String(overviewSelected.has(n.id)), onclick: () => {
    if (overviewSelected.has(n.id)) overviewSelected.delete(n.id); else overviewSelected.add(n.id);
    toggle.setAttribute('aria-pressed', String(overviewSelected.has(n.id)));
    refreshOverviewAction();
  } }, iel('check', 13)) : null;
  const pin = h('button', { class: 'overview-pin', type: 'button', 'aria-label': `${title} 고정`,
    'aria-pressed': String(n.pinned === true), title: n.pinned ? '고정 해제' : '메모 고정', onclick: () => {
      n.pinned = !n.pinned;
      save();
      if (overviewPinnedOnly && !n.pinned) {
        renderOverviewNotes();
        $('.overview-pinned-only')?.focus({ preventScroll: true });
      } else {
        pin.setAttribute('aria-pressed', String(n.pinned));
        pin.title = n.pinned ? '고정 해제' : '메모 고정';
      }
    } }, iel('pin', 15));
  const pc = paperOf(n);
  const el = h('div', { class: 'overview-item', style: pc ? `--paper-dot:${pc.bg}` : null },
    toggle,
    h('button', { class: 'overview-note-open', type: 'button', 'aria-label': `${title} 메모 열기`, title, onclick: () => openNote(n.id) },
      h('span', { class: 'overview-note-text' }, h('span', {}, title),
        excerpt && excerpt !== title ? h('small', {}, excerpt) : null),
      n.photos.length ? iel('image', 14) : null), pin);
  bindImageDrop(el, () => byId(n.id));
  return el;
}

async function searchOverviewNotes(key, query, candidates) {
  const search = { key, status: 'loading', ids: [] };
  overviewAiSearch = search;
  renderOverviewNotes();
  const batches = [];
  for (let start = 0; start < candidates.length; start += 40) {
    const batch = candidates.slice(start, start + 40);
    const payload = { query, notes: batch.map((n) => ({ title: memoTitle(n), text: n.text.slice(0, 2600) })) };
    const response = api.searchNotes ? await api.searchNotes(payload).catch(() => ({ ok: false })) : { ok: false, reason: 'nokey' };
    if (overviewAiSearch !== search) return;
    if (!response?.ok || !Array.isArray(response.indexes)) {
      search.status = response?.reason === 'nokey' ? 'nokey' : 'error';
      renderOverviewNotes();
      return;
    }
    batches.push([...new Set(response.indexes)]
      .filter((index) => Number.isInteger(index) && index >= 0 && index < batch.length)
      .slice(0, 8).map((index) => batch[index].id));
  }
  for (let rank = 0; rank < 8 && search.ids.length < 8; rank++) {
    for (const batch of batches) {
      if (batch[rank] && search.ids.length < 8) search.ids.push(batch[rank]);
    }
  }
  search.status = 'done';
  renderOverviewNotes();
}

function renderOverviewNotes() {
  const groups = $('#overview-groups');
  if (!groups) return;
  groups.replaceChildren();
  const query = overviewQuery.trim().normalize('NFC').toLocaleLowerCase('ko');
  const key = JSON.stringify([query, boardFilter, overviewPinnedOnly]);
  if (overviewAiSearch?.key !== key) overviewAiSearch = null;
  const keywords = query.split(/\s+/).filter(Boolean);
  for (const section of [...S.sections, INBOX]) {
    if (boardFilter !== 'all' && boardFilter !== section.id) continue;
    const notes = notesIn(section.id).filter((n) => {
      if (isEmpty(n) || (overviewPinnedOnly && !n.pinned)) return false;
      const text = `${memoTitle(n)} ${n.text}`.normalize('NFC').toLocaleLowerCase('ko');
      return keywords.every((word) => text.includes(word));
    });
    if (!notes.length && (query || overviewPinnedOnly || section === INBOX)) continue;
    const group = h('section', { class: 'bgroup', 'aria-label': `${section.name} 섹션` },
      h('header', { class: 'overview-row' }, h('h3', {}, `${section.name} ${notes.length}`),
        h('button', { type: 'button', class: 'overview-link', onclick: () => newNote(true, section.id), 'aria-label': `${section.name}에 새 메모` }, '＋')),
      h('div', { class: 'overview-items' }, notes.map(boardNote)));
    bindImageDrop(group, () => null, () => newNote(false, section.id));
    groups.append(group);
  }
  if (groups.childElementCount) return;
  if (!query) {
    groups.append(h('p', { class: 'overview-muted', role: 'status' }, '고정한 메모가 없어요.'));
    return;
  }
  const candidates = S.notes.filter((n) => !isEmpty(n) && (!overviewPinnedOnly || n.pinned) &&
    (boardFilter === 'all' || secIdOf(n) === boardFilter));
  const search = overviewAiSearch;
  if (search?.status === 'done') {
    const notes = search.ids.map((id) => candidates.find((n) => n.id === id)).filter(Boolean);
    groups.append(h('p', { class: 'overview-muted', role: 'status' },
      notes.length ? `AI가 찾은 관련 메모 ${notes.length}개` : voiceLine('notFound', {}, 'AI도 관련 메모를 찾지 못했어요.')));
    if (notes.length) groups.append(h('div', { class: 'overview-items' }, notes.map(boardNote)));
    return;
  }
  const loading = search?.status === 'loading';
  const needsKey = search?.status === 'nokey';
  const status = loading ? 'AI가 관련 메모를 찾고 있어요…' : needsKey ? 'AI 검색에는 Claude 연결이 필요해요.' :
    search?.status === 'error' ? 'AI 검색에 실패했어요. 다시 시도해 주세요.' : voiceLine('notFound', {}, '검색 결과가 없어요.');
  groups.append(h('div', { class: 'overview-search-empty' },
    h('p', { class: 'overview-muted', role: 'status' }, status),
    candidates.length && !loading ? h('button', {
      class: 'btn', type: 'button',
      onclick: needsKey ? openSettings : () => searchOverviewNotes(key, overviewQuery.trim().slice(0, 300), candidates),
    }, iel(needsKey ? 'gear' : 'sparkle', 14), needsKey ? 'AI 연결 설정' : 'AI가 찾아드릴게요') : null));
}

function refreshOverviewAction() {
  const find = $('#overview-merge-find');
  if (find) find.textContent = overviewSelected.size ? '선택한 메모에서 병합 후보 찾기' : '비슷한 메모 찾기';
  const button = $('#overview-organize');
  if (!button) return;
  const selected = [...overviewSelected].map(byId).filter(Boolean);
  const busy = selected.some((n) => organizing.has(n.id));
  button.disabled = selected.length === 0 || busy;
  $('#overview-selection').textContent = busy ? '메모를 정리하고 있어요…' : selected.length
    ? `선택한 메모 ${selected.length}개에서 요점과 일정을 찾아요.` : '메모 목록에서 정리할 메모를 선택하세요.';
}

function overviewSchedule() {
  const date = overviewDay;
  const today = startOfDay(new Date());
  const todayCount = todayEvents().length;
  const dateKey = P.isoLocal(date).slice(0, 10);
  const monday = addDays(date, -((date.getDay() + 6) % 7));
  const allEvents = S.notes.flatMap((n) => n.events.map((e) => ({ n, e })));
  const events = allEvents.filter(({ e }) => startOfDay(new Date(e.at)).getTime() === date.getTime())
    .sort((a, b) => a.e.at - b.e.at);
  const active = events.filter(({ e }) => !e.done);
  const markedDays = new Set(allEvents.filter(({ e }) => !e.done).map(({ e }) => startOfDay(new Date(e.at)).getTime()));
  const days = Array.from({ length: 7 }, (_, offset) => {
    const day = addDays(monday, offset);
    const marked = markedDays.has(day.getTime());
    return h('button', {
      class: 'upcoming-day', type: 'button', 'aria-pressed': String(day.getTime() === date.getTime()),
      'aria-current': day.getTime() === today.getTime() ? 'date' : null,
      'aria-label': `${fmtDate(day)}${marked ? ', 일정 있음' : ''}`,
      onclick: () => {
        overviewDay = day;
        refreshAgenda();
        $('.upcoming-day[aria-pressed="true"]')?.focus({ preventScroll: true });
      },
    }, h('small', {}, WD[day.getDay()]), h('strong', {}, day.getDate()),
    h('span', { class: marked ? 'upcoming-dot' : 'upcoming-dot empty-dot', 'aria-hidden': 'true' }));
  });
  const manageOpen = $('.upcoming-manage')?.open === true;
  const input = h('input', { id: 'overview-date', type: 'date', value: dateKey, 'aria-label': '일정 날짜',
    onchange: () => {
      if (!input.value) return;
      overviewDay = startOfDay(new Date(input.value + 'T00:00:00'));
      refreshAgenda();
      $('#overview-date')?.focus({ preventScroll: true });
    },
  });
  return h('section', { class: 'overview-card upcoming-card', id: 'overview-schedule', 'aria-label': '일정' },
    h('header', { class: 'overview-row upcoming-head' }, h('h2', {}, '이번 주 일정'), h('span', {}, `오늘 일정 ${todayCount}개`)),
    h('div', { class: 'upcoming-week', role: 'group', 'aria-label': `${fmtDate(monday)}부터 일주일` }, days),
    active.length ? h('ul', { class: 'upcoming-events' }, active.map(({ n, e }) =>
      h('li', {}, h('button', { type: 'button', onclick: () => openNote(n.id) },
        h('span', { class: 'upcoming-event-dot', 'aria-hidden': 'true' }),
        h('span', { class: 'upcoming-event-title' }, e.title),
        h('time', { datetime: P.isoLocal(new Date(e.at)) }, e.allDay ? '종일' : upcomingTime.format(e.at))))))
      : h('p', { class: 'overview-muted' }, '등록된 일정이 없어요.'),
    h('details', { class: 'upcoming-manage', open: manageOpen }, h('summary', {}, '일정 관리'),
      h('div', { class: 'overview-row overview-calendar' }, input,
        h('button', { class: 'overview-link', type: 'button', onclick: () => {
          overviewDay = startOfDay(new Date());
          refreshAgenda();
          $('.upcoming-day[aria-current="date"]')?.focus({ preventScroll: true });
        } }, '오늘')),
      h('div', { class: 'overview-schedule-list' }, events.map(({ n, e }) => scheduleRow(n, e))),
      h('div', { class: 'overview-schedule-actions' },
        h('button', { class: 'overview-link', type: 'button', onclick: rescan }, '메모에서 일정 찾기'),
        h('button', { class: 'overview-link', type: 'button', onclick: demoAlarm }, '알람 체험'))));
}

async function refreshPetControls(action, value) {
  const target = $('#overview-pet');
  if (!api.petControls) return;
  let state;
  try { state = await api.petControls(action, value); }
  catch { toast({ title: '펫을 불러오지 못했어요', ttl: 3500 }); return; }
  if (!state) return;
  activePetId = state.species.find((item) => item.selected)?.id;
  if (petPresent !== state.present) {
    petPresent = state.present;
    renderTabs();
    applyMode();
  }
  queuePerch();
  if (target?.isConnected) {
    target.hidden = state.present;
    target.replaceChildren(state.present ? '' :
      h('button', { class: 'btn primary', type: 'button', onclick: () => refreshPetControls('show', petIdFor(S.settings.character)) }, '펫 소환하기'));
  }
  return state;
}

function renderTrashBoard() {
  const back = h('button', { class: 'btn', type: 'button', onclick: () => { viewingTrash = false; renderBoard(); } }, '전체보기');
  const list = h('div', { class: 'trash-list' }, S.trash.length ? S.trash.map(({ note, removedAt }) =>
    h('article', { class: 'trash-note' },
      h('div', {}, h('strong', {}, memoTitle(note) || note.text.trim().slice(0, 45) || '사진 메모'),
        h('small', {}, secOf(note).name + ' · ' + fmtDate(new Date(removedAt)) + (note.photos.length ? ' · 사진 ' + note.photos.length + '장' : ''))),
      h('button', { class: 'btn', type: 'button', onclick: () => restoreNote(note.id) }, '복원')))
    : h('p', { class: 'overview-muted' }, '휴지통이 비어 있어요.'));
  $('#modal').replaceChildren(h('section', { class: 'mikkang-overview', role: 'region', 'aria-label': '휴지통' },
    h('header', { class: 'overview-toolbar' }, h('h1', {}, '휴지통'), back,
      h('button', { class: 'overview-icon', type: 'button', 'aria-label': '닫기', onclick: closeBoard }, iel('x', 16))), list));
  updateHit();
}
let letterView = false;
let letterIndex = 0;
const letterGreetings = {
  'mono-cat':'이번 주도 잘 버텼네. 네가 해낸 일, 내가 기억해 뒀어.',
  'vintage-teddy':'주인님께, 한 주 동안 애쓰셨습니다. 이번 주 기록을 살펴보았습니다.',
  'block-dino':'이번 주도 제법이구먼. 자네가 남긴 기록을 같이 보세.',
  'pastel-octopus':'이번 주도 수고 많았어요. 여덟 팔로 소중히 모은 소식을 전해요!',
  'basic-memoring':'한 주 동안 차곡차곡 남긴 기록을 편지에 담았어요!',
};
function deliverWeeklyLetter(now) {
  const delivery = WeeklyLetter.due(now, S.settings, S.lettersSince, S.letters);
  if (!delivery) return;
  const id = S.settings.character;
  S.letters.unshift({ ...delivery, ...WeeklyLetter.summary(S.notes, delivery.at), id, name:C.charName(S), read:false });
  save();
  if (modalKind === 'board') { if (letterView) letterIndex = Math.min(letterIndex + 1, S.letters.length - 1); renderBoard(); }
  toast({title:C.charName(S)+'의 주간 편지가 도착했어요', actions:[{label:'편지 열기',run:openLetters}], ttl:10000});
}
function openLetters() {
  openBoard(); letterView = true; letterIndex = 0; renderBoard();
}
function renderLetters() {
  const letter = S.letters[letterIndex];
  const name = letter?.name || C.charName(S);
  const id = letter?.id || S.settings.character;
  const weekday = '일월화수목금토'[S.settings.letterDay];
  const date = at => new Date(at).toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'long'});
  const sign = id === 'mono-cat' ? '까망이가' : name+' 올림';
  const article = letter && h('article',{class:'letter-paper'},
    h('small',{},date(letter.at)),h('h2',{},'이번 주를 마치며'),
    h('p',{},letterGreetings[id] || '이번 주의 소식을 전해요!'),
    h('p',{},`이번 주 새로 남긴 메모는 ${letter.notes}개예요.`),
    [['이번 주에 마친 일',letter.done || '완료로 표시한 일이 없어요.'],
     ['아직 챙기실 일',letter.pending || '남아 있는 일정이 없어요.'],
     ['다음 주 첫 일정',letter.next ? date(letter.next.at)+' '+(letter.next.allDay ? '종일' : upcomingTime.format(letter.next.at))+' · '+letter.next.title : '등록된 일정이 없어요.']
    ].map(([heading,body]) => h('section',{},h('strong',{},heading),h('p',{},body))),
    h('footer',{},sign));
  const justOpened = letter && !letter.read;
  if (justOpened) { letter.read=true; save(); }
  const portrait = h('div',{class:'letter-portrait', 'aria-hidden':'true', html:C.charHTML(id,S.settings.customChar)});
  $('#modal').replaceChildren(h('section',{class:'mikkang-overview letter-desk','aria-label':'주간 편지'},
    h('header',{class:'overview-toolbar'},h('h1',{},name+'의 주간 편지'),h('small',{},weekday+'요일 '+S.settings.letterTime),
      h('button',{class:'overview-icon',type:'button','aria-label':'편지 닫기',onclick:() => {letterView=false;renderBoard();}},iel('x',18))),
    h('div',{class:'letter-layout'},h('aside',{class:'letter-sender','data-author':id},
      h('span',{class:'letter-envelope','aria-hidden':'true','data-unread':String(!!justOpened)},'✉'),
      h('small',{},letter ? (justOpened ? '새 편지' : '받은 편지') : '편지함'),portrait,
      S.letters.length > 1 && h('select',{'aria-label':'지난 편지',onchange:e=>{letterIndex=Number(e.target.value);renderLetters();}},
        S.letters.map((l,i)=>h('option',{value:i,selected:i===letterIndex},date(l.at))))),
      article || h('article',{class:'letter-paper'},h('h2',{},'첫 편지를 기다리는 중이에요'),h('p',{},`매주 ${weekday}요일 ${S.settings.letterTime}에 편지가 도착해요.`)))));
  updateHit();
}
function renderBoard() {
  if (letterView) { renderLetters(); return; }
  if (viewingTrash) { renderTrashBoard(); return; }
  const m = $('#modal'), ov = boardOverview();
  const previousScroll = $('.overview-grid')?.scrollTop || 0;
  const ai = S.boardAI && S.boardAI.hash === boardHash() ? S.boardAI : null;
  const live = (id) => notesIn(id).filter((n) => !isEmpty(n));
  const secs = [...S.sections]; if (live('').length) secs.push(INBOX);
  const total = S.notes.filter((n) => !isEmpty(n)).length;
  const chips = h('div', { class: 'bfilter', role: 'group', 'aria-label': '섹션 고르기' },
    h('button', { type: 'button', 'aria-pressed': String(boardFilter === 'all'), onclick: () => { boardFilter = 'all'; renderBoard(); } }, `전체 ${total}`),
    secs.map((x) => { const c = secColor(x); return h('button', { type: 'button', 'aria-pressed': String(boardFilter === x.id), style: `--tc:${c.bg};--ti:${c.ink}`, onclick: () => { boardFilter = x.id; renderBoard(); } }, `${x.name} ${live(x.id).length}`); }));
  const groups = h('div', { id: 'overview-groups' });
  const quick = h('input', { type: 'text', placeholder: '메모를 입력하세요', 'aria-label': '빠른 메모', required: true });
  const quickSection = h('select', { class: 'overview-quick-section', 'aria-label': '빠른 메모 섹션' },
    h('option', { value: '' }, '분류 없음'),
    S.sections.map((section) => h('option', { value: section.id, selected: section.id === openSec }, section.name)));
  const weatherValue = h('dd', {}, '—');
  const weatherSource = h('small', {class:'weather-source', hidden:true});
  const weatherLabel = h('dt', {}, '날씨');
  const now = Date.now(), today = startOfDay(new Date(now));
  const remaining = todayEvents().filter(({ e }) => e.allDay || e.at >= now);
  const alarm = S.notes.flatMap((n) => n.events).filter((e) => !e.done && e.alarm && e.at > now)
    .sort((a, b) => a.at - b.at)[0];
  const search = h('input', { id: 'overview-search', type: 'search', value: overviewQuery, 'aria-label': '메모 검색',
    placeholder: '메모 검색', oninput: (e) => { overviewQuery = e.target.value; renderOverviewNotes(); },
    onkeydown: (e) => {
      if (e.key !== 'Escape' || !e.currentTarget.value) return;
      e.preventDefault(); e.stopPropagation();
      overviewQuery = e.currentTarget.value = ''; renderOverviewNotes();
    } });
  const cards = {
    trash: h('button', { class: 'overview-card overview-trash', type: 'button',
      onclick: () => { viewingTrash = true; renderBoard(); } },
      iel('trash', 16), h('strong', {}, '휴지통'), h('span', {}, `${S.trash.length}개`)),
    assistant: h('section', { class: 'overview-card overview-assistant' },
      h('header', { class: 'overview-row' },
        h('h2', {}, '오늘'),
        h('button', { class: 'overview-avatar', type: 'button', 'aria-label': C.charName(S), onclick: toggleMenu, html: perchHTML() })),
      h('dl', { class: 'overview-today' },
        h('div', {}, weatherLabel, weatherValue),
        h('div', {}, h('dt', {}, '남은 일정'), h('dd', {}, remaining.length)),
        h('div', {}, h('dt', {}, '다음 알람'), h('dd', {}, alarm ? fmtTime(new Date(alarm.at)) : '—'))),
      weatherSource,
      alarm ? h('p', { class: 'overview-muted' }, `다음 알람 · ${alarm.title}`) : null,
      api.petControls ? h('div', { id: 'overview-pet', class: 'overview-pet', hidden: true }) : null,
      h('form', { class: 'overview-quick', onsubmit: (e) => {
        e.preventDefault();
        const text = quick.value.trim();
        if (!text) return;
        const note = blankNote(quickSection.value);
        note.text = text;
        S.notes.unshift(note);
        openNote(note.id);
      } }, quickSection, quick, h('button', { class: 'overview-icon', type: 'submit', 'aria-label': '메모 추가' }, iel('send', 16)))),
    schedule: overviewSchedule(),
    memos: h('section', { class: 'overview-card' },
      h('header', { class: 'overview-row' }, h('h2', {}, '메모 모아보기'),
        h('div', { class: 'overview-list-actions' },
          total ? h('button', { class: 'overview-link overview-selection-toggle', type: 'button', 'aria-pressed': String(overviewSelecting), onclick: () => {
            overviewSelecting = !overviewSelecting;
            if (!overviewSelecting) overviewSelected.clear();
            renderBoard();
            $('.overview-selection-toggle')?.focus({ preventScroll: true });
          } }, overviewSelecting ? '선택 취소' : '선택') : null,
          h('button', { class: 'btn primary overview-add-note', type: 'button', onclick: () => newNote() }, iel('plus', 14), '메모'))),
      total ? h('div', { class: 'overview-library-tools' },
        h('button', { type: 'button', class: 'overview-pinned-only', 'aria-pressed': String(overviewPinnedOnly), onclick: (e) => {
          overviewPinnedOnly = !overviewPinnedOnly;
          e.currentTarget.setAttribute('aria-pressed', String(overviewPinnedOnly));
          renderOverviewNotes();
        } }, iel('pin', 14), '고정한 메모')) : null,
      chips, total ? groups : h('p', { class: 'overview-muted' }, '아직 메모가 없어요.')),
    ai: h('section', { class: 'overview-card overview-ai' },
      h('header', { class: 'overview-row' }, h('h2', {}, 'AI 정리'),
        h('button', { id: 'overview-organize', class: 'btn primary', type: 'button', onclick: async () => {
          const notes = [...overviewSelected].map(byId).filter(Boolean);
          const job = (async () => { for (const note of notes) await organizeNote(note, {}); })();
          refreshOverviewAction();
          try { await job; for (const note of notes) overviewSelected.delete(note.id); }
          catch { toast({ title: '메모를 정리하지 못했어요', ttl: 3500 }); }
          if (modalKind === 'board') renderBoard();
        } }, '정리하기')),
      mergeControls(total),
      h('p', { id: 'overview-selection', class: 'overview-muted', role: 'status' }),
      h('details', { class: 'overview-summary', open: $('.overview-summary')?.open || false },
        h('summary', {}, '전체 요약'),
        ai ? h('p', { class: 'bsum-ai' }, ai.text) : [h('p', {}, ov.head), h('ul', {}, ov.lines.map((line) => h('li', {}, line)))],
        h('button', { class: 'btn', type: 'button', onclick: (e) => aiBoardSummary(e.currentTarget) }, iel('sparkle', 14), ai ? '다시 요약' : 'AI 요약'))),
  };
  const layout = S.settings.overviewLayout;
  const visible = layout.filter((card) => !card.hidden);
  const grid = h('div', { class: 'overview-grid' },
    overviewEditing ? overviewLayoutEditor(layout) : null,
    visible.map(({ id }) => h('div', { class: 'overview-slot', 'data-widget-card': id }, cards[id])),
    !visible.length && !overviewEditing ? h('p', { class: 'overview-card overview-muted' }, '위젯 편집에서 표시할 항목을 고를 수 있어요.') : null);
  const panel = h('div', { class: 'mikkang-overview', role: 'region', 'aria-label': '전체보기' },
    h('header', { class: 'overview-toolbar' },
      h('h1', {}, '전체보기'), h('button',{class:'btn weekly-inbox',type:'button',onclick:openLetters}, S.letters.some(l=>!l.read) ? '✉ 새 편지' : '✉ 편지함'), h('time', { datetime: P.isoLocal(today).slice(0, 10) }, fmtDate(today)),
      total && visible.some(({ id }) => id === 'memos') ? search : null,
      h('button', { class: 'btn overview-edit', type: 'button', 'aria-expanded': String(overviewEditing), onclick: () => {
        overviewEditing = !overviewEditing;
        renderBoard();
        $('.overview-edit')?.focus({ preventScroll: true });
      } }, iel('edit', 14), overviewEditing ? '편집 완료' : '위젯 편집'),
      h('button', { class: 'overview-icon', type: 'button', 'aria-label': '설정', onclick: openSettings }, iel('gear', 16)),
      h('button', { class: 'overview-icon overview-close', type: 'button', 'aria-label': '위젯 접기', onclick: closeBoard }, iel('x', 16))),
    grid);
  m.replaceChildren(panel);
  if (weatherValue.isConnected && api.weather) {
    const city = (S.settings.weatherCity || '서울').trim();
    void api.weather(city).then((result) => {
      if (!weatherValue.isConnected || !result?.ok || !Number.isFinite(result.now?.temp)) return;
      weatherValue.textContent = `${Math.round(result.now.temp)}°`;
      weatherSource.textContent = '날씨 제공 · '+(result.source || '기상청');
      weatherSource.hidden = false;
      weatherLabel.textContent = result.today?.pop == null ? WMO(result.now.code) : `비 ${result.today.pop}%`;
    }).catch(() => {});
  }
  renderOverviewNotes();
  grid.scrollTop = previousScroll;
  refreshOverviewAction();
  void refreshPetControls();
}

/* ─────────── 시작 ─────────── */
function applySide() {
  queuePerch();
  const left = S.settings.side === 'left';
  $('#stage').classList.toggle('side-left', left); $('#stage').classList.toggle('side-right', !left);
  if (bubble.open) placeBubble();
}
function seed() {
  const mk = (theme, sectionId, text, x = {}) => {
    const a = P.localAnalyze(text, x.title || '');
    const n = { id: uid(), theme, sectionId, secManual: true, title: x.title || '', text, keyword: x.keyword || a.keyword, kwManual: false, summary: a.summary, events: [], photos: [], stickers: x.stickers || [], aiSource: 'local', createdAt: Date.now() - (x.age || 0), viewedAt: Date.now() - (x.age || 0), orgHash: '' };
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
  if (!Array.isArray(s.trash)) s.trash = [];
  s.settings = Object.assign({}, DEFAULTS, s.settings || {});
  if (s.settings.character !== 'custom' && !Object.hasOwn(C.CHARS, s.settings.character)) {
    s.settings.character = DEFAULTS.character;
  }
  if (!Array.isArray(s.letters)) s.letters = [];
  if (!Number.isFinite(s.lettersSince)) s.lettersSince = Date.now();
  if (!Number.isInteger(s.settings.letterDay) || s.settings.letterDay < 0 || s.settings.letterDay > 6) s.settings.letterDay = 5;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.settings.letterTime)) s.settings.letterTime = '17:00';
  s.settings.overviewLayout = normalizeOverviewLayout(s.settings.overviewLayout);
  if (s.settings.modeOverride === 'pet') s.settings.modeOverride = 'auto';
  // 이전 웹 버전(chaekgalpi-memo-v1) 데이터의 side 값을 이어받는다
  if (s.side && !s._sideMigrated) { s.settings.side = s.side; s._sideMigrated = true; }
  if (!Array.isArray(s.sections)) s.sections = DEFAULT_SECTIONS();
  for (const n of s.notes) {
    n.events = n.events || []; n.photos = n.photos || []; n.stickers = n.stickers || []; n.summary = n.summary || [];
    delete n.audios;
    n.title = n.title || ''; n.text = n.text || ''; n.keyword = n.keyword || ''; n.ring = false;
    for (const e of n.events) { if (e.pre == null) e.pre = 0; if (e.preFired == null) e.preFired = false; }
  }
  return s;
}

function petBriefingText(id) {
    const now = Date.now();
    const events = todayEvents().filter(({ e }) => e.allDay || e.at >= now);
    const next = events[0]?.e;
    const time = next && (next.allDay ? '종일' : fmtTime(new Date(next.at)));
    const line = voiceLine('petBriefing', { count: events.length, next: next?.title, time },
      next ? `남은 일정 ${events.length}개\n다음 ${time} ${next.title}` : '오늘 남은 일정이 없어요.', id);
    const lunch = lunchLine(events, id, now);
    return lunch ? `${line}\n${lunch}` : line;
}

// Each patch includes the painted eye and a small margin of surrounding fur or skin.
const wallPetFaces = {
  'mono-cat': [[139,299,46,47],[297,251,47,48]],
  'pastel-octopus': [[136,301,26,19],[309,254,28,18]],
  'vintage-teddy': [[139,293,25,31],[290,259,25,31]],
  'basic-memoring': [[143,238,28,32],[288,206,28,31]],
  'coral-otter': [],
  'block-dino': []
};
const wallPetImages = new Map();
function drawWallPet() {
  const pet = $('#bookmark-pet');
  if (!pet || pet.hidden) return;
  const id = pet.dataset.species, face = wallPetFaces[id], canvas = pet.firstElementChild;
  canvas.hidden = !face;
  if (!face) return;
  let img = wallPetImages.get(id);
  if (!img) {
    img = new Image();
    wallPetImages.set(id, img);
    img.onload = drawWallPet;
    const portrait = getComputedStyle(pet).getPropertyValue('--wall-portrait').trim();
    img.src = portrait.slice(4, -1).replace(/^['"]|['"]$/g, '');
  }
  if (!img.naturalWidth) { canvas.hidden = true; return; }
  const width = img.naturalWidth, height = img.naturalHeight;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const box = pet.getBoundingClientRect(), left = S.settings.side === 'left';
  const centerX = left ? box.left + box.height * width / height / 2 : box.right - box.height * width / height / 2;
  const dx = cursor.x < 0 ? 0 : (cursor.x - centerX) * (left ? -1 : 1);
  const dy = cursor.x < 0 ? 0 : cursor.y - (box.top + box.height * .5);
  const distance = Math.max(85, Math.hypot(dx, dy));
  const x = dx / distance, y = dy / distance;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  if (id === 'block-dino') {
    // Pivot at the paw. The fixed canvas clips everything beyond the wall.
    ctx.translate(width, height * .82);
    ctx.rotate(.085 * y);
    ctx.scale(1 - x * .045, 1);
    ctx.translate(-width, -height * .82);
  }
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  // Move the painted pupils only a fraction of their width so the gaze stays relaxed.
  for (const [cx, cy, rx, ry] of face) {
    const offsetX = x * rx * .13, offsetY = y * ry * .10;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    ctx.clip();
    ctx.drawImage(img, offsetX, offsetY);
    ctx.restore();
  }
}
let perchFrame = 0, perchedSpecies, perchOrigin;
function queuePerch() {
  if (!perchFrame) perchFrame = requestAnimationFrame(() => { perchFrame = 0; placeBookmarkPet(); });
}
function placeBookmarkPet() {
  const pet = $('#bookmark-pet');
  if (!pet || !S) return;
  const tab = $('.overview-tab');
  const species = activePetId || petIdFor(S.settings.character);
  const show = petPresent && !modalOpen && tab?.getClientRects().length && (species || S.settings.customChar);
  const size = Math.round((S.settings.petSize || 80) * 0.6);
  $('#stage').classList.toggle('pet-on-bookmarks', !!show);
  $('#stage').style.setProperty('--bookmark-pet-size', size + 'px');
  pet.hidden = !show;
  const next = show ? species : null;
  if (next !== perchedSpecies) { api.perchPet?.(next || null); perchedSpecies = next; }
  if (!show) { perchOrigin = null; return; }
  pet.dataset.species = species || 'custom';
  pet.style.backgroundImage = !['basic-memoring','mono-cat','block-dino','pastel-octopus','vintage-teddy','coral-otter'].includes(species) && S.settings.customChar ? 'url(' + JSON.stringify(S.settings.customChar) + ')' : '';
  const rect = tab.getBoundingClientRect(), stage = $('#stage').getBoundingClientRect();
  pet.style.left = S.settings.side === 'left' ? '0px' : Math.max(0, stage.width - size) + 'px';
  const perchHeight = size;
  pet.style.height = perchHeight+'px';
  const topClearance = parseFloat(getComputedStyle(pet).getPropertyValue('--bookmark-top-clearance'));
  pet.style.top = Math.max(topClearance, rect.top - stage.top - perchHeight) + 'px';
  drawWallPet();
  if (perchOrigin && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const dx = perchOrigin.x - pet.offsetLeft, dy = perchOrigin.y - pet.offsetTop;
    const lift = Math.min(64, pet.offsetTop);
    const arcX = Math.abs(dx) < size ? (pet.offsetLeft < W() / 2 ? size : -size) * .65 : 0;
    const frames = Array.from({ length: 17 }, (_, i) => {
      const t = i / 16;
      const x = dx * (1 - t) + arcX * Math.sin(Math.PI * t);
      const y = Math.max(topClearance - pet.offsetTop, dy * (1 - t) ** 2 - lift * Math.sin(Math.PI * t));
      return { transform: `translate(${x}px, ${y}px)` };
    });
    pet.animate(frames, { duration: 520, easing: 'ease-in-out' });
  }
  perchOrigin = null;
}
function bindGlobal() {
  const perch = h('button', { id: 'bookmark-pet', hidden: true, type: 'button',
    'aria-label': '책갈피 닫기 · 오른쪽 버튼을 길게 눌러 브리핑 듣기', onclick: () => togglePetBookmarks() });
  const wallCanvas = document.createElement('canvas');
  wallCanvas.hidden = true;
  wallCanvas.setAttribute('aria-hidden', 'true');
  perch.append(wallCanvas);
  const expand = h('button', { id: 'bookmark-expand', class: 'tab', type: 'button', 'aria-controls': 'dock', 'aria-expanded': 'false',
    onclick: () => { togglePetBookmarks(); $('.overview-tab')?.focus({ preventScroll: true }); } }, '책갈피 펼치기');
  $('#stage').append(perch, expand);
  let pressTimer = 0, briefed = false;
  const cancel = () => { clearTimeout(pressTimer); pressTimer = 0; };
  perch.oncontextmenu = (e) => e.preventDefault();
  perch.onpointerdown = (e) => {
    if (e.button !== 2) return;
    e.preventDefault(); perch.setPointerCapture(e.pointerId); briefed = false;
    pressTimer = setTimeout(() => {
      briefed = true;
      const p = perch.getBoundingClientRect(), stage = $('#stage').getBoundingClientRect();
      say(petBriefingText(perchedSpecies), { briefingArt:true, ttl: 8000, menu: false, anchor: { x: p.x-stage.x, y: p.y-stage.y, width: p.width, height: p.height }, actions: [{ label: '전체보기', run: openBoard }] });
    }, 1200);
  };
  perch.onpointerup = (e) => { if (e.button === 2 && pressTimer) { cancel(); if (!briefed) togglePetBookmarks(); } };
  perch.onpointercancel = perch.onlostpointercapture = cancel;
  window.addEventListener('blur', cancel);
  $('#dock').addEventListener('scroll', () => {queuePerch();positionShelfList();});
  addEventListener('resize',positionShelfList);

  api.onCursor((c) => { cursor = c; if (!c.on) cursor.x = -1; drawWallPet(); updateHit(); handleEdge(c); });
  document.addEventListener('mousemove', (e) => { cursor = { ...cursor, x: e.clientX, y: e.clientY }; drawWallPet(); updateHit(); });
  api.onForeground((f) => {
    if (f.kind === 'self') return;
    ctx = f.kind === 'app' ? 'app' : 'desktop';
    applyMode();
  });
  // 사진 파일을 화면 어디에 놓아도 메모에 들어간다 (열린 메모가 없으면 새 메모)
  let dragN = 0;
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
  document.addEventListener('dragenter', (e) => { if (hasFiles(e)) { dragN++; $('#stage').classList.add('filedrag'); } });
  document.addEventListener('dragleave', (e) => { if (hasFiles(e) && --dragN <= 0) { dragN = 0; $('#stage').classList.remove('filedrag'); } });
  document.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  const petTarget = '#bookmark-pet, #perch, #peek .pc, .overview-avatar';
  document.addEventListener('dragover', (e) => {
    if (e.target.closest?.(petTarget) && window.MemoDrop.accepts(e.dataTransfer)) {
      e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
    }
  });
  document.addEventListener('drop', (e) => {
    if (!window.MemoDrop.accepts(e.dataTransfer) || !e.target.closest?.(petTarget)) return;
    dragN = 0;
    $('#stage').classList.remove('filedrag');
    e.preventDefault();
    e.stopPropagation();
    const files = imageFiles(window.MemoDrop.files(e.dataTransfer));
    if (files.length) void openPhotoNote(files);
    else void feedContent(window.MemoDrop.content(e.dataTransfer));
  }, true);
  api.onPetContent?.(feedContent);
  api.onPetPhotos?.((photos) => {
    const files = photos.map(({ bytes, name, type }) => new File([bytes], name, { type }));
    void openPhotoNote(files);
  });
  api.onPetPhotoError?.((message) => toast({ title: message, ttl: 3000 }));
  document.addEventListener('drop', async (e) => {
    dragN = 0; $('#stage').classList.remove('filedrag');
    if (!hasFiles(e)) return;
    e.preventDefault();
    if (e.defaultPrevented && e._handled) return;
    if ([...document.querySelectorAll('.dropping')].length) return;
    const all = window.MemoDrop.files(e.dataTransfer), fs = imageFiles(all);
    if (!fs.length) { if (all.length) toast({ title: '사진 파일만 넣을 수 있어요', ttl: 3000 }); return; }
    if (e.target.closest && e.target.closest('.card,.tab,.overview-item,.bgroup')) return; // 각자 처리
    if (modalKind === 'board') closeBoard();
    let n = openId ? byId(openId) : null;
    if (!n) n = newNote(false);
    await addPhotos(n, fs);
    if (openId !== n.id) openNote(n.id);
  });
  api.onDisplay(() => { if (bubble.open) placeBubble(); });
  api.onPetChanged?.(() => { void refreshPetControls(); });
  api.onPetMenuSelected?.(applyPetMenuSelection);
  api.onPetBriefingRequest?.((id) => api.showPetBriefing(id, petBriefingText(id)));
  api.onOpenNote((id) => { if (id && byId(id)) openNote(id); });
  api.onCommand((cmd, anchor) => {
    if (cmd === 'summon') toggleDock();
    else if (cmd === 'board') openBoard();
    else if (cmd === 'new') newNote();
    else if (cmd === 'pet-bookmarks') togglePetBookmarks(anchor);
    else if (cmd === 'assistant') toggleMenu();
    else if (cmd === 'agenda') toggleAgenda();
    else if (cmd === 'settings') openSettings();
    else if (cmd.startsWith('mode:')) { S.settings.modeOverride = cmd.slice(5); dockFolded = false; forcedMode = null; save(); applyMode(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modalOpen) { if (viewerKeys) closeViewer(); else if (modalKind === 'board') closeBoard(); else closeSettings(); return; }
    const p = $('.pal:not([hidden])'); if (p) { p.hidden = true; return; }
    if (addingSec) { addingSec = false; renderTabs(); return; }
    if (peek.open) dismissPeek();
    else if (openId) closeNote();
    else if (bubble.open || summoned) closeAll();
  });
  document.addEventListener('pointerdown', (e) => { if (bubble.menu && !e.target.closest('#bubble, .overview-avatar')) closeBubble(); }, true);
  document.addEventListener('selectionchange', () => {
    const toolbar = $('.basic-format'), editor = $('.basic-editor'), selection = document.getSelection();
    if (toolbar && editor) toolbar.toggleAttribute('data-selection',
      !!selection?.rangeCount && !selection.isCollapsed && editor.contains(selection.getRangeAt(0).commonAncestorContainer));
  });
  addEventListener('resize', () => { queuePerch(); if (openId) placeNote(byId(openId)); for (const [id, { sheet }] of parkedSheets) placeNote(byId(id), sheet); if (bubble.open) placeBubble(); });
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
  if (![56, 64, 72, 80, 88, 96, 112, 128].includes(S.settings.petSize)) S.settings.petSize = 72;
  api.applySettings({ petSize: S.settings.petSize, launchAtLogin: S.settings.launchAtLogin, modeOverride: S.settings.modeOverride, proPreview: S.settings.proPreview });
  applyNoteFont();
  const today = new Date();
  document.documentElement.classList.toggle('memoring-holiday', today.getMonth() === 11 && [24, 25].includes(today.getDate()));
  bindGlobal();
  selectCharacter(loaded ? S.settings.character : themePack().character);
  applySide(); renderTabs(); applyMode();
  if (info.args?.includes('--overview')) openBoard();
  if (api.petControls) {
    const state = await refreshPetControls();
    const species = petIdFor(S.settings.character);
    if (state?.present && species && activePetId !== species) await refreshPetControls('show', species);
  }
  save();
  tick(); setInterval(tick, 5000);
  // 디버그/스크린샷용 훅
  window.__mk = { selectCharacter, paperOf, S: () => S, openNote, newNote, toggleDock, openPeek, openSettings, toggleAgenda, say, closeAll, askAssistant, setMood, applyMode, openBoard, closeBoard, toggleSection, toggleMenu, setCtx: (c) => { ctx = c; applyMode(); } };
}
boot();
})();
