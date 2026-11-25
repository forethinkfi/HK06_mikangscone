/* 파스텔 테마 (진현주)
 * - 메모지: 마스킹 테이프로 붙인 종이 (둥근 사각 · 반듯한 사각 · 손으로 찢은 종이 · 찢은 줄노트 · 겹친 종이 · 모서리 테이프)
 * - 메모지 색 5가지: 하늘 · 라벤더 · 크림 · 벚꽃 · 민트
 * - AI 비서: 말랑 문어 (이 테마를 위해 새로 그린 SVG)
 * - 글꼴: 메모먼트 꾹꾹체 (컴퓨터에 설치되어 있으면 사용, 없으면 Gaegu) */
(function (root) {
  'use strict';
  const C = root.Chars;
  if (C && !C.CHARS.octopus) {
    C.CHARS.octopus = {
      name: '문어비서', desc: '말랑말랑 분홍 문어', color: '#f49aa3', ink: '#c94a55',
      svg: () => `
        <ellipse cx="50" cy="92" rx="30" ry="4" fill="#000" opacity=".1"/>
        <g class="c-body">
          <path d="M16 60C16 33 31 17 50 17s34 16 34 43c2 6 4 11 0 16-4 5-10 2-13 4-3 4-9 4-12 1-3 4-15 4-18 0-3 3-9 3-12-1-3-2-9 1-13-4-4-5-2-10 0-16z" fill="#f6a2aa" stroke="#e0646f" stroke-width="3.4" stroke-linejoin="round"/>
          <path d="M22 70c4 3 9 2 12 0 3 3 9 3 12 0 3 3 9 3 12 0 3 3 9 2 12-1" fill="none" stroke="#fbc2c7" stroke-width="3" stroke-linecap="round"/>
          <ellipse cx="35" cy="31" rx="6.5" ry="5" fill="#fff" opacity=".9" transform="rotate(-20 35 31)"/>
          <circle cx="45" cy="29" r="2.4" fill="#fff" opacity=".9"/>
          <g class="c-eyes" style="transform-origin:50px 54px">
            <path d="M31 55.2l6.2-.9M69 55.2l-6.2-.9" stroke="#b84552" stroke-width="3.2" stroke-linecap="round"/>
          </g>
          <g class="c-blush"><ellipse cx="27" cy="61" rx="5" ry="2.8" fill="#ef7f8c" opacity=".35"/><ellipse cx="73" cy="61" rx="5" ry="2.8" fill="#ef7f8c" opacity=".35"/></g>
          <g class="c-mouth" style="transform-origin:50px 58px">
            <g class="c-smile"><circle cx="50" cy="58" r="5.4" fill="#f6a2aa" stroke="#b84552" stroke-width="2.6"/><ellipse cx="50" cy="58" rx="1.9" ry="1.6" fill="#b84552"/></g>
            <ellipse class="c-open" cx="50" cy="58.5" rx="4.4" ry="4" fill="#b84552"/>
          </g>
        </g>`,
    };
    if (!C.ORDER.includes('octopus')) C.ORDER.push('octopus');
  }
  root.MemoThemes && root.MemoThemes.register({
    id: 'pastel',
    name: '파스텔',
    author: '진현주',
    preview: ['#d6e6f7', '#e3dbf4', '#f7f2e6', '#f8dfe4', '#d8eee4'],
    noteColors: [
      { id: 'sky', name: '하늘', bg: '#d6e6f7', tab: '#c4daf2', ink: '#33475e', tape: '#f4efe2' },
      { id: 'lavender', name: '라벤더', bg: '#e3dbf4', tab: '#d4c8ef', ink: '#463a63', tape: '#f6f1e6' },
      { id: 'cream', name: '크림', bg: '#f7f2e6', tab: '#efe6d2', ink: '#4f4637', tape: '#cfe0f2' },
      { id: 'blossom', name: '벚꽃', bg: '#f8dfe4', tab: '#f3ccd5', ink: '#5e3a44', tape: '#f6f1e6' },
      { id: 'mint', name: '민트', bg: '#d8eee4', tab: '#c5e5d6', ink: '#335245', tape: '#e3dbf4' },
    ],
    paperShapes: ['rounded', 'square', 'deckle', 'lined', 'layered', 'corner'],
    character: 'octopus',
    petSpecies: 'pastel-octopus',
  });
})(typeof self !== 'undefined' ? self : this);
