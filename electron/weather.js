// 간단한 날씨: Open-Meteo (무료, API 키 필요 없음)
//  1) 지역 이름 → 좌표 (geocoding-api.open-meteo.com)
//  2) 좌표 → 지금 기온, 오늘·내일 최고/최저, 비 올 확률 (api.open-meteo.com)
const places = new Map(); // 지역 이름 → 좌표 (앱이 켜져 있는 동안 기억)
const cache = new Map();  // 지역 이름 → { at, data } (10분)

async function getJSON(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'MikangMemo/1.0' } });
  if (!r.ok) throw new Error('weather http ' + r.status);
  return r.json();
}

async function locate(name) {
  const key = name.trim();
  if (places.has(key)) return places.get(key);
  const q = encodeURIComponent(key);
  const j = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=ko&format=json`);
  const p = j.results && j.results[0];
  if (!p) return null;
  const place = { name: p.name || key, lat: p.latitude, lon: p.longitude };
  places.set(key, place);
  return place;
}

async function getWeather(city) {
  const name = String(city || '서울').trim().slice(0, 30) || '서울';
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < 10 * 60000) return hit.data;
  const place = await locate(name);
  if (!place) return { ok: false, error: `'${name}' 지역을 찾지 못했어요. 설정 → 날씨에서 지역 이름을 확인해 주세요.` };
  const j = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}`
    + '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=2');
  const d = j.daily || {};
  const day = (i) => ({ max: d.temperature_2m_max?.[i], min: d.temperature_2m_min?.[i], pop: d.precipitation_probability_max?.[i] ?? null, code: d.weather_code?.[i] ?? 0 });
  const data = { ok: true, place: place.name, now: { temp: j.current?.temperature_2m, code: j.current?.weather_code ?? 0 }, today: day(0), tomorrow: day(1) };
  cache.set(name, { at: Date.now(), data });
  return data;
}

module.exports = { getWeather };
