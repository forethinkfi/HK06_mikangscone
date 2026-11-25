# AI 메모지 (책갈피형 데스크톱 메모 앱) — 1차 MVP

화면 왼쪽 끝에 책갈피로 붙어 있다가, 누르면 펼쳐지는 메모지. React + Vite + TypeScript + Tailwind, Electron, Dexie(IndexedDB), Claude API.

## 실행

```powershell
npm install
copy .env.example .env   # .env에 ANTHROPIC_API_KEY=... 넣기
npm run app              # 개발 모드 (Vite + Electron, 코드 고치면 바로 반영)
npm start                # 빌드 후 실행
npm run dev              # 브라우저로 화면만 보기 (AI·알람·창 기능은 꺼짐)
```

- 접기/펼치기: 책갈피 탭 클릭 / 패널 왼쪽 위 `접기` 또는 Esc
- API 키는 `electron/ai.cjs`(메인 프로세스)에서만 읽어요. 화면 코드와 번들에는 들어가지 않아요.

## 직접 넣는 파일 (git에 없음)

저작권 때문에 아래 두 파일은 저장소에 올리지 않았어요. 없어도 앱은 돌아가고, 넣으면 그대로 적용돼요.

| 파일 | 넣을 위치 | 없을 때 |
| --- | --- | --- |
| 치치 프로필 사진 | `src/assets/chichi.png` | 그려진 토끼 캐릭터 |
| 온글잎 박다현체 | `public/fonts/onglip-parkdahyeon.ttf` | Pretendard 글꼴 |

## 구조

| 위치 | 내용 |
| --- | --- |
| `src/theme/themes.ts` | 테마 객체 3개(핑크 갸루·깔끔한 화이트·다크 글리터) → `applyTheme()`이 CSS 변수로 적용 |
| `src/theme/patterns.ts` | 호피·글리터·퀼팅·진주 테두리를 SVG/CSS로 직접 생성 |
| `src/components/cards/` | AI 비서 · Upcoming · 메모 목록 · 날짜/녹음/AI 정리 카드 |
| `src/components/MemoDetail.tsx` | 메모 상세 (자동 저장, 색, 이미지 붙여넣기·드래그, AI 결과, 알람 등록) |
| `src/components/Settings.tsx` | 테마 선택, Pro 커스텀(`isPro` 하나로 잠금), 하트 프레임 |
| `src/data/` | Dexie 훅, AI 정리 호출, 녹음 |
| `electron/main.cjs` | 창(왼쪽 끝·항상 위·테두리 없음, 접힘 44px / 펼침 420px) |
| `electron/notes.cjs` | 메모 창: 메모마다 따로 뜨는 스티커 창, 위치·크기를 `notes.json`에 기억하고 다음 실행 때 다시 띄움 |
| `src/NoteWindow.tsx` | 메모 창 한 장의 화면 (`?note=ID`로 열림) |
| `electron/ai.cjs` | Claude(`claude-opus-5-5`) 호출, JSON 스키마로 요약·태그·할 일·일정·결정사항 받기 |
| `electron/alarms.cjs` | 등록한 일정 → 시스템 알림 (20초마다 확인) |

## 정해 둔 것

- **정리 상태(%)**: 정리 전 0% → AI 정리 후 50% → 할 일을 끝낼수록 100%까지
- **AI 정리**는 버튼을 눌렀을 때만 실행. 찾은 일정은 `알람 등록`을 눌러야 등록됨
- 다시 정리해도 이미 등록한 알람과 체크한 할 일은 유지
- 사용자가 직접 쓴 제목은 AI가 바꾸지 않음 (회의록과 '새 메모'만 AI 제목 사용)

## 아직 미리보기인 것

- **음성→텍스트**: 녹음과 누적 시간은 실제로 동작하고, 받아쓰기는 예시 문장(`src/data/recorder.ts`의 `transcribe()`). 실제 STT를 붙일 때는 이 함수만 바꾸면 됨
- **구독 결제** 없음. 설정의 `Pro 미리보기` 스위치로 `isPro`를 켜서 확인
- 2차 범위(노션 업로드, 날씨 브리핑)는 아직 없음

## 개발용 확인 스위치 (환경 변수)

`AI_MEMO_USER_DATA=폴더` 진짜 메모와 분리된 저장공간으로 실행 · `AI_MEMO_OPEN=1` 펼친 채 시작 · `AI_MEMO_FAKE_AI=1` API 대신 테스트 응답 · `AI_MEMO_SHOT=파일.png` 화면 캡처 후 종료
