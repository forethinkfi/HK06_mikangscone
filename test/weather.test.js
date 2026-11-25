const test = require('node:test');
const assert = require('node:assert');
const { findKo, koName } = require('../electron/places-kr');

test('한글 지명은 앱에 넣어 둔 표에서 바로 찾는다', () => {
  assert.equal(findKo('서울').name, '서울');
  assert.equal(findKo('서울특별시').name, '서울');
  assert.equal(findKo('부산광역시').name, '부산');
  assert.equal(findKo('서울 강남구').name, '서울 강남구');
  assert.ok(Math.abs(findKo('서울 강남구').lat - 37.517) < 0.01);
  assert.equal(findKo('제주도').name, '제주');
  assert.equal(findKo('없는동네'), null);
});
test('IP 위치의 영문 이름을 한글로', () => {
  assert.equal(koName('Seoul'), '서울');
  assert.equal(koName('Gangnam-gu'), '강남구');
  assert.equal(koName('Busan'), '부산');
  assert.equal(koName('Tokyo'), 'Tokyo');
});

function mockFetch(routes) {
  const calls = [];
  global.fetch = async (url) => { calls.push(url); for (const [k, v] of routes) if (url.includes(k)) { if (v === 'fail') throw new Error('net'); return { ok: true, json: async () => v }; } throw new Error('no route ' + url); };
  return calls;
}
const FORE = { current: { temperature_2m: 3.4, apparent_temperature: -1.2, weather_code: 1 }, daily: { temperature_2m_max: [8, 6], temperature_2m_min: [-1, 0], precipitation_probability_max: [10, 70], weather_code: [2, 61] } };
const AIR = { current: { pm10: 45, pm2_5: 40 } };

test('지역을 말하면 그 지역 날씨 + 미세먼지 (지명 검색 서비스 없이)', async () => {
  delete require.cache[require.resolve('../electron/weather')];
  const calls = mockFetch([['air-quality', AIR], ['api.open-meteo.com/v1/forecast', FORE]]);
  const r = await require('../electron/weather').getWeather('강남구');
  assert.equal(r.ok, true); assert.equal(r.place, '강남구'); assert.equal(r.auto, false);
  assert.equal(r.air.grade, '나쁨'); // 초미세 40 → 나쁨
  assert.ok(!calls.some((u) => u.includes('geocoding')));
});
test('지역을 안 말하면 IP로 현재 위치, ipapi가 안 되면 ipwho.is', async () => {
  delete require.cache[require.resolve('../electron/weather')];
  mockFetch([['ipapi.co', 'fail'], ['ipwho.is', { success: true, city: 'Seongnam-si', region: 'Gyeonggi-do', latitude: 37.42, longitude: 127.12, country: 'South Korea' }], ['air-quality', AIR], ['forecast', FORE]]);
  const w = require('../electron/weather');
  const r = await w.getWeather('');
  assert.equal(r.ok, true); assert.equal(r.auto, true); assert.equal(r.place, '경기 성남');
  const here = await w.whereAmI();
  assert.equal(here.place, '경기 성남');
});
test('모르는 지명은 검색해서 한국 결과를 고른다', async () => {
  delete require.cache[require.resolve('../electron/weather')];
  mockFetch([['geocoding', { results: [{ name: 'Gimje', country_code: 'US', latitude: 1, longitude: 1 }, { name: '김제', country_code: 'KR', latitude: 35.8, longitude: 126.88 }] }], ['air-quality', AIR], ['forecast', FORE]]);
  const r = await require('../electron/weather').getWeather('김제');
  assert.equal(r.place, '김제');
});

test('컴퓨터 위치 서비스 좌표 → 동네 이름 + 날씨', async () => {
  delete require.cache[require.resolve('../electron/weather')];
  mockFetch([['nominatim', { address: { city: '서울특별시', borough: '강남구', quarter: '역삼동' } }], ['air-quality', AIR], ['forecast', FORE]]);
  const w = require('../electron/weather');
  const r = await w.getWeather({ lat: 37.5007, lon: 127.0365, acc: 35 });
  assert.equal(r.ok, true); assert.equal(r.src, 'os'); assert.equal(r.place, '서울 강남구 역삼동');
  const h = await w.whereAmI({ lat: 37.5007, lon: 127.0365, acc: 35 });
  assert.equal(h.place, '서울 강남구 역삼동'); assert.equal(h.acc, 35);
});
test('주소 서비스가 모두 안 되면 가까운 지명으로', async () => {
  delete require.cache[require.resolve('../electron/weather')];
  mockFetch([['nominatim', 'fail'], ['bigdatacloud', 'fail'], ['air-quality', AIR], ['forecast', FORE]]);
  const r = await require('../electron/weather').getWeather({ lat: 35.16, lon: 129.16 });
  assert.equal(r.place, '해운대');
});
