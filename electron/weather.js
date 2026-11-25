// 날씨 · 미세먼지 · 현재 위치 (모두 API 키 필요 없음)
//  - 날씨:    Open-Meteo Forecast API        (api.open-meteo.com)
//  - 미세먼지: Open-Meteo Air Quality API     (air-quality-api.open-meteo.com)
//  - 지명→좌표: 앱에 넣어 둔 한국 지명표 → 없으면 Open-Meteo Geocoding
//  - 현재 위치: 인터넷 주소(IP) 기준 대략적인 위치 — ipapi.co, 안 되면 ipwho.is
const { findKo, koName } = require('./places-kr');

const places = new Map();      // 지명 → 좌표 (앱이 켜져 있는 동안 기억)
const cache = new Map();       // 좌표 → { at, data } (10분)
let here = null;               // 현재 위치 { at, place } (30분)

async function getJSON(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'MikangMemo/1.0' } });
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}

async function locate(name) {
  const key = String(name || '').trim();
  if (!key) return null;
  const ko = findKo(key);
  if (ko) return ko;
  if (places.has(key)) return places.get(key);
  // 지명표에 없으면 검색 (한국 결과를 우선)
  for (const q of [key, key.replace(/(특별시|광역시|시|군|구|도)$/, '')]) {
    if (q.length < 2) continue;
    const j = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=ko&format=json`).catch(() => null);
    const list = (j && j.results) || [];
    const p = list.find((x) => x.country_code === 'KR') || list[0];
    if (p) {
      const place = { name: p.name || key, lat: p.latitude, lon: p.longitude };
      places.set(key, place);
      return place;
    }
  }
  return null;
}

/** 인터넷 주소(IP)로 대략적인 현재 위치 */
async function currentPlace() {
  if (here && Date.now() - here.at < 30 * 60000) return here.place;
  let place = null;
  try {
    const j = await getJSON('https://ipapi.co/json/');
    if (j && typeof j.latitude === 'number') {
      const city = koName(j.city), region = koName(j.region);
      place = { name: region && region !== city && !String(city).includes(region) ? `${region} ${city}` : city || region || '현재 위치', lat: j.latitude, lon: j.longitude, country: j.country_name };
    }
  } catch {}
  if (!place) {
    try {
      const j = await getJSON('https://ipwho.is/');
      if (j && j.success !== false && typeof j.latitude === 'number') {
        const city = koName(j.city), region = koName(j.region);
        place = { name: region && region !== city ? `${region} ${city}` : city || region || '현재 위치', lat: j.latitude, lon: j.longitude, country: j.country };
      }
    } catch {}
  }
  if (place) here = { at: Date.now(), place };
  return place;
}

// 한국 환경부 기준 미세먼지 등급
function airGrade(pm10, pm25) {
  const g10 = pm10 == null ? 0 : pm10 <= 30 ? 1 : pm10 <= 80 ? 2 : pm10 <= 150 ? 3 : 4;
  const g25 = pm25 == null ? 0 : pm25 <= 15 ? 1 : pm25 <= 35 ? 2 : pm25 <= 75 ? 3 : 4;
  return ['', '좋음', '보통', '나쁨', '매우 나쁨'][Math.max(g10, g25)] || '';
}

async function forecast(place) {
  const k = `${place.lat.toFixed(2)},${place.lon.toFixed(2)}`;
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < 10 * 60000) return hit.data;
  const [w, a] = await Promise.all([
    getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}`
      + '&current=temperature_2m,apparent_temperature,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=2'),
    getJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.lat}&longitude=${place.lon}&current=pm10,pm2_5&timezone=auto`).catch(() => null),
  ]);
  const d = w.daily || {};
  const day = (i) => ({ max: d.temperature_2m_max?.[i], min: d.temperature_2m_min?.[i], pop: d.precipitation_probability_max?.[i] ?? null, code: d.weather_code?.[i] ?? 0 });
  const pm10 = a?.current?.pm10 ?? null, pm25 = a?.current?.pm2_5 ?? null;
  const data = { now: { temp: w.current?.temperature_2m, feels: w.current?.apparent_temperature, code: w.current?.weather_code ?? 0 }, today: day(0), tomorrow: day(1), air: { pm10, pm25, grade: airGrade(pm10, pm25) } };
  cache.set(k, { at: Date.now(), data });
  return data;
}

/** city가 비어 있으면 현재 위치(IP 기준)의 날씨 */
async function getWeather(city) {
  const name = String(city || '').trim().slice(0, 30);
  let place, auto = false;
  if (name) {
    place = await locate(name);
    if (!place) return { ok: false, error: `'${name}' 지역을 찾지 못했어요. '부산', '강남구', '제주'처럼 말해 주세요.` };
  } else {
    place = await currentPlace(); auto = true;
    if (!place) { place = findKo('서울'); auto = false; }
  }
  const data = await forecast(place);
  return { ok: true, place: place.name, auto, ...data };
}

/** 지금 어디쯤인지 (IP 기준) */
async function whereAmI() {
  const p = await currentPlace();
  return p ? { ok: true, place: p.name, country: p.country || '' } : { ok: false, error: '지금 위치를 알아내지 못했어요. 인터넷 연결을 확인해 주세요.' };
}

module.exports = { getWeather, whereAmI };
