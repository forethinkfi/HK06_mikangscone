const config = require('./ai-service.json');
const origin = process.env.MEMO_AI_ORIGIN || config.origin;
async function request(path, code, payload) {
  if (!origin) return { ok: false, reason: 'error', error: '운영 서버 주소가 설정되지 않았어요.' };
  try {
    const url = new URL(path, origin);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === '127.0.0.1')) throw Error();
    const response = await fetch(url, {
      method: payload ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(70000),
      headers: { ...(code ? {Authorization: 'Bearer ' + code} : {}), 'Content-Type': 'application/json' },
      body: payload ? JSON.stringify({ ...payload, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }) : undefined,
    });
    return await response.json();
  } catch { return { ok: false, reason: 'error', error: '운영 서버에 연결할 수 없어요.' }; }
}
const direct = !require('electron').app.isPackaged && process.argv.includes('--direct-api')
  ? require('../server/direct-api').directSession() : null;
module.exports = { request: direct ? direct.request : request, direct };
