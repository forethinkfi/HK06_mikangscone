const hosted = require('./hosted-ai');
const { getKey } = require('./store');
const { weatherService } = require('../server/kma');
let cachedKey, personalWeather;
function getWeather(city) {
  const key = !hosted.direct && getKey('kma');
  if (key !== cachedKey) {
    cachedKey = key;
    personalWeather = key ? weatherService(key) : null;
  }
  if (personalWeather) return personalWeather(city);
  return hosted.request('/weather?city=' + encodeURIComponent(String(city || '서울').slice(0, 30)));
}
module.exports = { getWeather };
