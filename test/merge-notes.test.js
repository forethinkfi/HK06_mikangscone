const test = require('node:test');
const assert = require('node:assert/strict');
const { draft, pairs } = require('../src/merge-notes');

test('merge preserves originals, unique paragraphs, photos and distinct alarm settings', () => {
  const a = { text: '회의 자료\n\n도표 추가', sectionId: 'work', photos: ['a'], stickers: [{ x: 2 }],
    events: [{ id: 'a', at: 5, alarm: true }], pinned: true };
  const b = { text: '회의 자료\n\n통계 출처 확인', photos: ['a', 'b'],
    events: [{ id: 'b', at: 5, alarm: false }] };
  const original = structuredClone([a,b]);
  const result = draft([a,b], '회의');
  assert.equal(result.text, '회의 자료\n\n도표 추가\n\n통계 출처 확인');
  assert.deepEqual(result.photos, ['a','b']);
  assert.equal(result.events.length, 2);
  assert.equal(result.pinned, true);
  result.stickers[0].x = 10;
  assert.deepEqual([a,b], original);
});

test('only valid, disjoint candidate pairs can be applied', () => {
  const pair = (first, second) => ({ first, second, title: '관련 메모' });
  assert.deepEqual(pairs([pair(-1,1), pair(2,2), pair(2,9), pair(0,1), pair(1,2), pair(2,3)],4),
    [pair(0,1),pair(2,3)]);
});
