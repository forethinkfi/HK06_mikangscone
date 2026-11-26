const hosted = require('./hosted-ai');
function getWeather(city) {
  return hosted.request('/weather?city=' + encodeURIComponent(String(city || '서울').slice(0, 30)));
}
module.exports = { getWeather };
