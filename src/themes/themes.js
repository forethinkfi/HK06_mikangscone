/* 테마 모음 — 팀원마다 자기 테마를 src/themes/<이름>/ 폴더에 만들어 여기에 등록한다.
 * 테마 하나 = 색·글꼴(theme.css) + 메모지 색 목록 + AI 비서 캐릭터 + 데스크톱 펫(species) 을 한 묶음으로.
 * 자세한 방법은 hk06-docs/docs/THEMES.md 참고. */
(function (root) {
  'use strict';
  const list = [];
  const MemoThemes = {
    /**
     * @param {object} t
     * @param {string} t.id          고유 이름 (영문). <html data-theme-pack="id"> 로 CSS가 적용된다
     * @param {string} t.name        화면에 보일 이름
     * @param {string} [t.author]    만든 사람
     * @param {string[]} [t.preview] 설정 화면 미리보기 색 3~5개
     * @param {{id:string,name:string,bg:string,tab?:string,ink?:string,tape?:string}[]} [t.noteColors] 메모지 색 (없으면 기본 노란 메모지)
     * @param {string[]} [t.paperShapes] 메모지 모양 이름 목록 (theme.css 의 [data-paper] 와 짝)
     * @param {string} [t.character] 이 테마의 AI 비서 캐릭터 id (characters.js 의 CHARS)
     * @param {string} [t.petSpecies] 데스크톱 펫 species id (pet/assets/species/<id>)
     */
    register(t) {
      if (!t || !t.id || list.some((x) => x.id === t.id)) return;
      list.push(t);
    },
    list: () => list.slice(),
    get: (id) => list.find((x) => x.id === id) || list[0],
  };
  // 기본 테마: 지금의 세이지 그린 디자인 + 미깡이
  MemoThemes.register({ id: 'default', name: '기본 (세이지)', author: '팀 공통', preview: ['#ddebe1', '#f8eaa5', '#f0c9c4', '#cfdfdc', '#4a644c'], character: 'mikang', petSpecies: 'mikkang' });
  root.MemoThemes = MemoThemes;
})(typeof self !== 'undefined' ? self : this);
