// Loaded only by an unpackaged Electron app started with --direct-api.
const personal = require('../electron/personal-openai');
const { weatherService } = require('./kma');
const { exchange } = require('./calendar-auth');

function directSession(provider = fetch) {
  let openai = '', kma = '', weather, google;
  const status = () => ({ direct: true, openai: !!openai, kma: !!kma, hosted: false });
  function set(name, value) {
    if (name === 'openai') openai = value.trim();
    if (name === 'kma') { kma = value.trim(); weather = weatherService(kma, provider); }
  }
  function useGoogle(json) {
    const client = json?.installed;
    if (!client?.client_id || !client.client_secret) throw Error('데스크톱 앱용 Google OAuth JSON을 선택해 주세요.');
    google = {client_id:client.client_id, client_secret:client.client_secret};
  }
  async function request(path, _code, payload) {
    try {
      if (path.startsWith('/weather?')) {
        if (!kma) throw Error('설정 → 날씨에서 기상청 인증키를 입력해 주세요.');
        return await weather(new URLSearchParams(path.split('?')[1]).get('city'));
      }
      if (path.startsWith('/calendar/')) {
        if (!google) throw Error('설정에서 Google OAuth JSON을 선택해 주세요.');
        if (path === '/calendar/client') return {ok:true,clientId:google.client_id};
        if (path === '/calendar/token') return (await exchange(google,payload,provider)).data;
      }
      return personal.request(openai, path, payload, provider);
    } catch (e) { return {ok:false,reason:'error',error:e.message}; }
  }
  return { request, set, useGoogle, status };
}
module.exports = { directSession };
