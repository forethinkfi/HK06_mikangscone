const test = require('node:test');
const assert = require('node:assert');
const P = require('../src/parse.js');

// 2026-11-25(수) 오전 10:00 기준
const NOW = new Date(2026, 10, 25, 10, 0, 0);
const at = (y, m, d, h, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();

test('내일 12시까지 회의자료 제출 → 내일 12:00 마감', () => {
  const [e] = P.parseEvents('내일 12시까지 회의자료 제출', NOW);
  assert.equal(e.at, at(2026, 11, 26, 12));
  assert.equal(e.title, '회의자료 제출');
  assert.equal(e.deadline, true);
});

test('오후/오전 표기와 분', () => {
  assert.equal(P.parseEvents('모레 오후 3시 30분 치과', NOW)[0].at, at(2026, 11, 27, 15, 30));
  assert.equal(P.parseEvents('내일 오전 9시 반 스탠드업', NOW)[0].at, at(2026, 11, 26, 9, 30));
  assert.equal(P.parseEvents('내일 3시 미팅', NOW)[0].at, at(2026, 11, 26, 15));
});

test('요일 / 다음주 / 날짜', () => {
  assert.equal(P.parseEvents('금요일 오후 2시 팀 회의', NOW)[0].at, at(2026, 11, 27, 14));
  assert.equal(P.parseEvents('다음주 월요일 오전 10시 중간 발표', NOW)[0].at, at(2026, 11, 30, 10));
  assert.equal(P.parseEvents('12월 3일 저녁 7시 송년회', NOW)[0].at, at(2026, 12, 3, 19));
  assert.equal(P.parseEvents('12/24 크리스마스 선물', NOW)[0].at, at(2026, 12, 24, 9));
});

test('상대 시간', () => {
  assert.equal(P.parseEvents('30분 뒤 빨래 꺼내기', NOW)[0].at, NOW.getTime() + 30 * 60000);
  assert.equal(P.parseEvents('3일 뒤 택배 반품', NOW)[0].at, at(2026, 11, 28, 9));
});

test('날짜 없는 메모는 일정이 없다', () => {
  assert.deepEqual(P.parseEvents('우유, 달걀, 두부', NOW), []);
});

test('키워드 추측', () => {
  assert.equal(P.guessKeyword('내일 12시까지 회의자료 제출', ''), '회의자료');
});
