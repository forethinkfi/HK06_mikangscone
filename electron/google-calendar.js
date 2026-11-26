const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const { app, safeStorage, shell } = require('electron');
const hosted = require('./hosted-ai');
const scope = 'https://www.googleapis.com/auth/calendar.events.owned.readonly';
const tokenPath = () => path.join(app.getPath('userData'),hosted.direct ? 'google-calendar-dev.bin' : 'google-calendar.bin');
const connected = () => fs.existsSync(tokenPath());
let busy = false;
function persist(value) {
  if (!safeStorage.isEncryptionAvailable()) throw Error('이 기기의 보안 저장소를 사용할 수 없어요.');
  fs.writeFileSync(tokenPath()+'.tmp',safeStorage.encryptString(value),{mode:0o600});
  fs.renameSync(tokenPath()+'.tmp',tokenPath());
}
function authorize(clientId) {
  const state = randomBytes(24).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  return new Promise((resolve,reject) => {
    let redirect;
    let done = false;
    const server = http.createServer((req,res) => {
      let u;
      try { u = new URL(req.url,'http://127.0.0.1'); } catch { res.writeHead(400); res.end(); return; }
      if (req.method !== 'GET' || u.pathname !== '/callback' || u.searchParams.get('state') !== state) {
        res.writeHead(400); res.end(); return;
      }
      const code = u.searchParams.get('code');
      res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Connection':'close'});
      res.end('미깡메모 앱으로 돌아가 연결 결과를 확인하세요.');
      finish(code ? null : Error('Google 캘린더 연결을 취소했어요.'),{code,code_verifier:verifier,redirect_uri:redirect});
    });
    const timer = setTimeout(() => finish(Error('연결 시간이 지났어요. 다시 연결해 주세요.')),180000);
    function finish(err,value) {
      if (done) return;
      done = true; clearTimeout(timer); server.close();
      if (err) reject(err); else resolve(value);
    }
    server.on('error',() => finish(Error('Google 연결을 위한 로컬 창구를 열 수 없어요.')));
    server.listen(0,'127.0.0.1',() => {
      redirect = 'http://127.0.0.1:'+server.address().port+'/callback';
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search = new URLSearchParams({client_id:clientId,redirect_uri:redirect,response_type:'code',scope,
        access_type:'offline',prompt:'consent',state,code_challenge_method:'S256',
        code_challenge:createHash('sha256').update(verifier).digest('base64url')});
      shell.openExternal(url.href).catch(() => finish(Error('기본 브라우저를 열 수 없어요.')));
    });
  });
}
async function today(access) {
  const start = new Date(); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(end.getDate()+1);
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.search = new URLSearchParams({timeMin:start.toISOString(),timeMax:end.toISOString(),singleEvents:'true',
    orderBy:'startTime',maxResults:'250',fields:'nextPageToken,items(summary,start,status)'});
  const events = [];
  let page;
  do {
    if (page) url.searchParams.set('pageToken',page);
    const res = await fetch(url,{headers:{Authorization:'Bearer '+access},signal:AbortSignal.timeout(12000)});
    if (!res.ok) throw Error('Google 일정 읽기 권한과 Calendar API 사용 설정을 확인해 주세요.');
    const data = await res.json();
    for (const e of data.items || []) if (e.status !== 'cancelled') events.push({title:e.summary || '제목 없는 일정',start:e.start?.dateTime || e.start?.date,allDay:!!e.start?.date});
    page = data.nextPageToken;
  } while (page);
  return events;
}
async function calendar(action) {
  if (action === 'status') return {ok:true,connected:connected()};
  if (busy) return {ok:false,connected:connected(),error:'진행 중인 캘린더 요청이 있어요.'};
  busy = true;
  try {
    if (action === 'disconnect') {
      if (connected()) {
        const token = safeStorage.decryptString(fs.readFileSync(tokenPath()));
        const r = await fetch('https://oauth2.googleapis.com/revoke',{method:'POST',body:new URLSearchParams({token}),signal:AbortSignal.timeout(10000)});
        if (!r.ok && r.status !== 400) throw Error('연결 해제를 완료하지 못했어요. 다시 시도해 주세요.');
        fs.unlinkSync(tokenPath());
      }
      return {ok:true,connected:false};
    }
    let grant;
    if (action === 'connect') {
      if (!safeStorage.isEncryptionAvailable()) throw Error('Google 계정을 연결하려면 기기 보안 저장소가 필요해요.');
      const cfg = await hosted.request('/calendar/client');
      if (!cfg.ok) throw Error(cfg.error);
      grant = await authorize(cfg.clientId);
    } else if (action === 'today' && connected()) {
      grant = {refresh_token:safeStorage.decryptString(fs.readFileSync(tokenPath()))};
    } else throw Error('먼저 Google 캘린더를 연결해 주세요.');
    const token = await hosted.request('/calendar/token',null,grant);
    if (!token.ok) {
      if (token.reconnect && grant.refresh_token) fs.rmSync(tokenPath(),{force:true});
      throw Error(token.error);
    }
    if (token.refresh_token) persist(token.refresh_token);
    else if (!grant.refresh_token) throw Error('Google 인증을 다시 진행해 주세요.');
    return {ok:true,connected:true,events:await today(token.access_token)};
  } catch (e) { return {ok:false,connected:connected(),error:e.message || '캘린더 요청을 완료하지 못했어요.'}; }
  finally { busy = false; }
}
module.exports = { calendar };
