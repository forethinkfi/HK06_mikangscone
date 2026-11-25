/* AI 비서 캐릭터. 모두 이 앱용으로 새로 그린 SVG이다.
 * 각 캐릭터는 같은 얼굴 부품(.c-eyes, .c-mouth, .c-blush)을 써서 CSS로 깜빡임·말하기·듣기 표정을 바꾼다. */
(function (root) {
  'use strict';
  const face = (cx, cy, ink = '#3a2e28', blush = '#f49b8b', gap = 13) => `
    <g class="c-eyes" style="transform-origin:${cx}px ${cy}px">
      <ellipse cx="${cx - gap}" cy="${cy}" rx="3.6" ry="4.6" fill="${ink}"/>
      <ellipse cx="${cx + gap}" cy="${cy}" rx="3.6" ry="4.6" fill="${ink}"/>
      <circle cx="${cx - gap + 1.3}" cy="${cy - 1.6}" r="1.3" fill="#fff"/>
      <circle cx="${cx + gap + 1.3}" cy="${cy - 1.6}" r="1.3" fill="#fff"/>
    </g>
    <g class="c-blush"><ellipse cx="${cx - gap - 7}" cy="${cy + 8}" rx="5.5" ry="3.2" fill="${blush}" opacity=".7"/><ellipse cx="${cx + gap + 7}" cy="${cy + 8}" rx="5.5" ry="3.2" fill="${blush}" opacity=".7"/></g>
    <g class="c-mouth" style="transform-origin:${cx}px ${cy + 9}px">
      <path class="c-smile" d="M${cx - 5} ${cy + 7} Q${cx - 2.5} ${cy + 11} ${cx} ${cy + 8} Q${cx + 2.5} ${cy + 11} ${cx + 5} ${cy + 7}" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse class="c-open" cx="${cx}" cy="${cy + 9.5}" rx="3.6" ry="3.2" fill="${ink}"/>
    </g>`;

  const CHARS = {
    mikang: {
      name: '귤비서', desc: '새콤달콤 귤',
      color: '#f59a3c', ink: '#6b3a12',
      svg: () => `
        <ellipse cx="50" cy="93" rx="26" ry="4" fill="#000" opacity=".12"/>
        <g class="c-body">
          <path d="M50 22c22 0 38 15 38 36S72 92 50 92 12 79 12 58s16-36 38-36z" fill="#f7a23f"/>
          <path d="M50 22c22 0 38 15 38 36S72 92 50 92 12 79 12 58s16-36 38-36z" fill="url(#mk-g)"/>
          <circle cx="30" cy="44" r="1.4" fill="#e58a2a"/><circle cx="70" cy="70" r="1.4" fill="#e58a2a"/><circle cx="66" cy="38" r="1.2" fill="#e58a2a"/><circle cx="34" cy="76" r="1.2" fill="#e58a2a"/>
          <path d="M28 40c4-7 12-11 18-11" stroke="#fff" stroke-opacity=".55" stroke-width="4" fill="none" stroke-linecap="round"/>
          <g class="c-leaf" style="transform-origin:50px 24px"><path d="M50 24c-1-6 1-10 4-12" stroke="#6d8a3a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M54 16c6-8 18-8 22-4-5 7-15 9-22 4z" fill="#86b04a"/><path d="M56 15c6-3 12-4 17-3" stroke="#5f8a2c" stroke-width="1.2" fill="none"/></g>
          ${face(50, 58, '#5a2e0e', '#ef6f5c')}
        </g>
        <defs><radialGradient id="mk-g" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffc56b" stop-opacity=".8"/><stop offset="1" stop-color="#ef8a2b" stop-opacity=".1"/></radialGradient></defs>`,
    },
    cat: {
      name: '냥비서', desc: '꼼꼼한 고양이',
      color: '#c9b8a6', ink: '#3a2e28',
      svg: () => `
        <ellipse cx="50" cy="93" rx="26" ry="4" fill="#000" opacity=".12"/>
        <g class="c-body">
          <path class="c-tail" d="M78 82c12-2 14-16 8-22" stroke="#d8c7b4" stroke-width="7" fill="none" stroke-linecap="round" style="transform-origin:78px 82px"/>
          <path d="M18 40L22 12 40 28zM82 40L78 12 60 28z" fill="#e6d7c5" stroke="#cdb9a2" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M23 34l2-14 9 8zM77 34l-2-14-9 8z" fill="#f4b6b0"/>
          <path d="M50 24c24 0 36 15 36 34 0 20-15 34-36 34S14 78 14 58c0-19 12-34 36-34z" fill="#efe3d4"/>
          <path d="M36 26c4 6 4 12 0 16M50 24v14M64 26c-4 6-4 12 0 16" stroke="#d7c3ab" stroke-width="3" fill="none" stroke-linecap="round"/>
          ${face(50, 58)}
          <path d="M47 62.5l3 2 3-2z" fill="#e9877e"/>
          <path d="M20 60h-10M21 66l-9 3M80 60h10M79 66l9 3" stroke="#bba48c" stroke-width="1.4" stroke-linecap="round"/>
        </g>`,
    },
    bunny: {
      name: '토비서', desc: '부지런한 토끼',
      color: '#f3c3cf', ink: '#3a2e28',
      svg: () => `
        <ellipse cx="50" cy="93" rx="26" ry="4" fill="#000" opacity=".12"/>
        <g class="c-body">
          <g class="c-ears" style="transform-origin:50px 34px">
            <path d="M34 36C26 20 28 2 36 2s12 18 8 34z" fill="#fff" stroke="#efdfe3" stroke-width="1.5"/>
            <path d="M36 32c-4-10-4-22 0-24 4 2 5 14 3 24z" fill="#f7c2cd"/>
            <path d="M66 36c8-16 6-34-2-34s-12 18-8 34z" fill="#fff" stroke="#efdfe3" stroke-width="1.5"/>
            <path d="M64 32c4-10 4-22 0-24-4 2-5 14-3 24z" fill="#f7c2cd"/>
          </g>
          <path d="M50 30c22 0 34 13 34 31 0 19-14 31-34 31S16 80 16 61c0-18 12-31 34-31z" fill="#fff" stroke="#efdfe3" stroke-width="1.5"/>
          ${face(50, 60, '#3a2e28', '#f59fb1', 12)}
          <path d="M48 66.5l2 1.6 2-1.6" fill="none" stroke="#e98da0" stroke-width="1.6" stroke-linecap="round"/>
        </g>`,
    },
    cloud: {
      name: '구름비서', desc: '포근한 구름',
      color: '#cfe1ef', ink: '#2d3b4d',
      svg: () => `
        <ellipse cx="50" cy="93" rx="28" ry="4" fill="#000" opacity=".1"/>
        <g class="c-body">
          <path d="M26 86c-12 0-18-9-16-18 1-8 8-13 15-12 0-14 11-24 25-24 12 0 21 7 24 17 10 0 17 8 16 18-1 11-9 19-20 19z" fill="#fff" stroke="#d6e4ef" stroke-width="2"/>
          <path d="M30 48c4-6 10-9 16-9" stroke="#e3eef7" stroke-width="5" fill="none" stroke-linecap="round"/>
          ${face(52, 64, '#2d3b4d', '#f4a6b6', 12)}
          <g class="c-drop"><path d="M86 30c0 4-3 6-5 6s-5-2-5-6c0-3 5-9 5-9s5 6 5 9z" fill="#a9d3ee"/></g>
        </g>`,
    },
  };
  const ORDER = ['mikang', 'cat', 'bunny', 'cloud'];

  /** 캐릭터 SVG(또는 사용자가 올린 이미지) HTML. */
  function charHTML(id, customSrc) {
    if (id === 'custom' && customSrc && /^data:image\//.test(customSrc)) {
      return `<div class="c-custom"><img src="${customSrc}" alt="" draggable="false"><span class="c-custom-shadow"></span></div>`;
    }
    const c = CHARS[id] || CHARS.mikang;
    return `<svg class="c-svg" viewBox="0 0 100 100" aria-hidden="true">${c.svg()}</svg>`;
  }
  const charName = (S) => (S.settings.petName || '').trim() || (CHARS[S.settings.character] || CHARS.mikang).name;
  root.Chars = { CHARS, ORDER, charHTML, charName };
})(typeof self !== 'undefined' ? self : this);
