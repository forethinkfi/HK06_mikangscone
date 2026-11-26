const fs = require('node:fs');
function config() {
  const raw = process.env.GOOGLE_DESKTOP_OAUTH_JSON ||
    (process.env.GOOGLE_DESKTOP_OAUTH_FILE && fs.readFileSync(process.env.GOOGLE_DESKTOP_OAUTH_FILE,'utf8'));
  const installed = raw && JSON.parse(raw.replace(/^\uFEFF/, '')).installed;
  if (!installed?.client_id || !installed.client_secret) throw Error('데스크톱 앱 OAuth JSON을 운영 서버에 등록해 주세요.');
  return installed;
}
async function calendarRoute(req, send, provider = fetch) {
  let client;
  try { client = config(); } catch { return send(503,{ok:false,error:'운영 서버에 Google 데스크톱 앱 OAuth JSON을 등록해 주세요.'}); }
  if (req.method === 'GET' && req.url === '/calendar/client') return send(200,{ok:true,clientId:client.client_id});
  if (req.method !== 'POST' || req.url !== '/calendar/token') return send(404,{ok:false});
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 16384) return send(413,{ok:false});
  }
  let p;
  try { p = JSON.parse(raw); } catch { return send(400,{ok:false}); }
  const { status, data } = await exchange(client,p,provider);
  return send(status,data);
}
async function exchange(client,p,provider = fetch) {
  const result = (status,data) => ({status,data});
  let grant;
  if (typeof p?.refresh_token === 'string' && p.refresh_token) {
    grant = {grant_type:'refresh_token',refresh_token:p.refresh_token};
  } else if (typeof p?.code === 'string' && /^[A-Za-z0-9_-]{43,128}$/.test(p.code_verifier) &&
      /^http:\/\/127\.0\.0\.1:\d{1,5}\/callback$/.test(p.redirect_uri)) {
    grant = {grant_type:'authorization_code',code:p.code,code_verifier:p.code_verifier,redirect_uri:p.redirect_uri};
  } else return result(400,{ok:false,error:'Google 연결 요청을 확인해 주세요.'});
  const res = await provider('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',
    signal:AbortSignal.timeout(12000),body:new URLSearchParams({...grant,client_id:client.client_id,client_secret:client.client_secret})});
  const data = await res.json();
  if (!res.ok || !data.access_token) return result(400,{ok:false,reconnect:data.error === 'invalid_grant',error:'Google 연결을 확인하고 다시 시도해 주세요.'});
  return result(200,{ok:true,access_token:data.access_token,refresh_token:data.refresh_token});
}
module.exports = { calendarRoute, exchange };
