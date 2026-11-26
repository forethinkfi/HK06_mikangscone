# 테마 만들기

팀원마다 자기 테마를 하나씩 맡아 만듭니다. 테마 하나에는 **색 · 글꼴 · 메모지 · AI 비서 캐릭터 · 데스크톱 펫**이 한 묶음으로 들어가고, 사용자는 설정 → **테마**에서 고릅니다.

| 테마 | 폴더 | 만든 사람 |
| --- | --- | --- |
| 기본 (세이지) | `src/design-system.css` | 팀 공통 |
| 파스텔 | `src/themes/pastel/` | 진현주 |
| 모노 스케치 · 다크 | `src/themes/mono-sketch/` | mikangscone |
| 빈티지 크래프트 | `src/themes/vintage/` | 테마 미리보기 원본 제공 |

## 새 테마 추가하기

1. `src/themes/<영문이름>/` 폴더를 만들어요. (예: `src/themes/retro/`)
2. `theme.js` — 테마를 등록해요.

```js
(function (root) {
  root.MemoThemes.register({
    id: 'retro',                 // 폴더 이름과 같게
    name: '레트로',               // 설정에 보일 이름
    author: '홍길동',
    preview: ['#f2c14e', '#f78154', '#4d9078', '#b4436c'],   // 설정 화면 색 미리보기
    noteColors: [                 // 메모지 색 (없으면 기본 노란 메모지)
      { id: 'mustard', name: '머스터드', bg: '#f6d98a', tab: '#f0c95e', ink: '#4a3a12', tape: '#f4efe2' },
    ],
    paperShapes: ['square'],      // theme.css 의 [data-paper="…"] 와 짝
    character: 'mikang',          // AI 비서 캐릭터 (src/characters.js 의 CHARS id, 직접 추가해도 됨)
    petSpecies: 'mikkang',        // 데스크톱 펫 (pet/assets/species/<id>)
  });
})(typeof self !== 'undefined' ? self : this);
```

3. `theme.css` — 모든 규칙을 `:root[data-theme-pack="retro"]` 아래에 써요. 그래야 다른 테마에 영향을 주지 않아요.
   - 색은 `--mikkang-ink`, `--mikkang-paper`, `--mikkang-surface`, `--mikkang-line`, `--mikkang-action`, `--mikkang-sage-light` … 같은 토큰을 바꾸면 화면 전체에 적용돼요. 파스텔 테마의 `theme.css`를 참고하세요.
   - 글꼴은 `--f-ui`, `--f-display`, `--f-hand`를 바꿔요.
   - 메모지는 `.sheet.basic-note` (`--pc` 종이색, `--pi` 글자색, `--pt` 테이프색)와 `.sheet[data-paper="…"] .card`로 꾸며요.
4. `src/index.html`에 두 줄을 더해요: `<link rel="stylesheet" href="themes/retro/theme.css">`, `<script src="themes/retro/theme.js"></script>` (`themes/themes.js` 다음).
5. 미리보기는 `npm run preview`가 `src/themes/` 안의 테마를 **자동으로** 모두 넣어요. 내 테마로 시작하는 미리보기는 `node tools/build-preview.js preview/retro.html --theme retro`.

## 캐릭터 · 데스크톱 펫

- AI 비서 캐릭터는 `theme.js`에서 `Chars.CHARS.<id> = { name, color, svg: () => '…' }`로 추가할 수 있어요 (파스텔의 문어비서 참고). 눈은 `.c-eyes`, 입은 `.c-mouth`(`.c-smile`/`.c-open`)로 묶으면 깜빡임·말하기 움직임이 저절로 붙어요.
- 데스크톱 펫은 `pet/assets/species/<id>/`에 `sprite.png`(384×384, 투명 배경)와 `species.json`(미깡이 것을 복사해서 `id`·`displayName`·`attribution`만 바꾸기)을 넣으면 돼요.

## 글꼴 라이선스

글꼴 파일을 저장소나 미리보기에 넣는 건 재배포예요. 라이선스에서 임베딩·재배포가 허용되는지 먼저 확인하고, 아니면 각자 컴퓨터에 설치해서 쓰도록 `local()`로만 불러오세요 (파스텔 테마의 `fonts/README.md` 참고).

기본 테마 `basic`은 메모링(`basic-memoring`)과 여섯 가지 메모지 색을 제공하며 새 설치에서 선택됩니다.
