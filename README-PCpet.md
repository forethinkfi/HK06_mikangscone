# PCpet · 먹고자 데스크톱 펫

[Pety / Window Pet](https://github.com/Gavin-Dementia/Pety)의 MIT 엔진을 기반으로 한 개인용 커스터마이징 프로젝트입니다. 원본 LICENSE와 자산 라이선스 안내를 유지합니다.

## 시작

Node.js 22 이상에서:

```sh
npm install
npm run setup:munchlax
npm start
```

설치 후 `먹고자 실행.cmd`를 더블클릭해도 됩니다. 펫을 잡아 이동하거나 클릭해 반응을 보세요. 작업 표시줄 알림 영역의 펫 아이콘 메뉴에서 숨기기와 종료를 선택합니다.

## 이미지 수정

개인 이미지는 `personal-species/munchlax/`에 있습니다. `munchlax.png`를 교체하면 모든 상태에 반영됩니다. 기본 475 × 475 투명 PNG이며 약 180픽셀로 표시합니다. `species.json`에서 상태별 그림·프레임·배율·걷는 속도를 조절하세요. 폴더 안 `이미지 수정 안내.txt`에 예시를 정리했습니다. 저장 시 자동 반영됩니다.

기본 버전은 한 장의 일러스트에 호흡·뒤뚱거림·흔들림·클릭 반응을 적용합니다. 잠들 때 눈을 감는 등의 별도 포즈는 아직 없으며 상태별 시트를 추가할 수 있습니다. 현재 펫은 실행 시 마우스가 있는 모니터에서 활동합니다.

캐릭터 이미지는 Git에서 제외됩니다. 설정 예시는 `examples/munchlax/`에 있고, 설정 스크립트는 PokeAPI sprites의 이미지를 개인 폴더로 다운로드합니다. Pokémon 이미지 권리는 원권리자에게 있으며 MIT 코드 라이선스에 포함되지 않습니다.

## 검증

```sh
npm run typecheck
npm run lint
npm test
npm run build
```
