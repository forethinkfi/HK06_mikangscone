/* AI 비서 이미지와 캐릭터 이름 */
(function (root) {
  'use strict';

  const defaultId = 'basic-memoring';
  const CHARS = {};
  const ORDER = [];
  const character = (id) => Object.hasOwn(CHARS, id) ? CHARS[id] : CHARS[defaultId];

  function charHTML(id, customSrc) {
    if (id === 'custom' && customSrc && /^data:image\//.test(customSrc)) {
      return `<div class="c-custom"><img src="${customSrc}" alt="" draggable="false"><span class="c-custom-shadow"></span></div>`;
    }
    const c = character(id);
    if (c.className) return `<span class="character-image ${c.className}" aria-hidden="true"></span>`;
    return `<svg class="c-svg" viewBox="0 0 100 100" aria-hidden="true">${c.svg()}</svg>`;
  }

  const charName = (state) => (state.settings.petName || '').trim() || character(state.settings.character).name;
  function weatherDetails(w) {
    const summary = w.tomorrow ? w.forecast : w.temperature + " · " + w.current;
    return w.place + (w.tomorrow ? " 내일 " : " 지금 ") + summary + " · " + w.range + (w.probability == null ? "" : " · 강수 확률 " + w.probability + "%") + ".";
  }
  root.Chars = { weatherDetails, CHARS, ORDER, defaultId, character, charHTML, charName };
})(typeof self !== 'undefined' ? self : this);
