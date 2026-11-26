const test = require('node:test');
const assert = require('node:assert/strict');
const { service } = require('../server');
const { weatherService } = require('../server/kma');
const { openLedger } = require('../server/ledger');

test('desktop calendar exposes only client ID and exchanges PKCE without an AI account', async () => {
  const old = process.env.GOOGLE_DESKTOP_OAUTH_JSON;
  process.env.GOOGLE_DESKTOP_OAUTH_JSON = JSON.stringify({installed:{client_id:'desktop',client_secret:'test-fixture'}});
  const ledger = openLedger(':memory:');
  const app = service(ledger,'',async (url,{body}) => {
    assert.equal(url,'https://oauth2.googleapis.com/token');
    assert.equal(body.get('grant_type'),'authorization_code');
    assert.equal(body.get('client_secret'),'test-fixture');
    return Response.json({access_token:'fixture-access',refresh_token:'fixture-refresh'});
  });
  try {
    await new Promise(r=>app.listen(0,'127.0.0.1',r));
    const base = 'http://127.0.0.1:'+app.address().port;
    assert.deepEqual(await (await fetch(base+'/calendar/client')).json(),{ok:true,clientId:'desktop'});
    const send = redirect_uri => fetch(base+'/calendar/token',{method:'POST',body:JSON.stringify({code:'fixture',code_verifier:'a'.repeat(43),redirect_uri})});
    assert.equal((await send('https://example.org')).status,400);
    assert.equal((await (await send('http://127.0.0.1:1234/callback')).json()).ok,true);
  } finally {
    if (old === undefined) delete process.env.GOOGLE_DESKTOP_OAUTH_JSON; else process.env.GOOGLE_DESKTOP_OAUTH_JSON=old;
    await new Promise(r=>app.close(r)); ledger.close();
  }
});

test('KMA requests coalesce and return observed temperature and two KST forecast days',async () => {
  let calls=0;
  const kst = n=>new Date(Date.now()+9*3600000+n*86400000).toISOString().slice(0,10).replaceAll('-','');
  const weather = weatherService('sample%2Bkey',async url=>{
    calls++;
    assert.equal(url.searchParams.get('serviceKey'),'sample+key');
    const item = url.pathname.endsWith('getUltraSrtNcst') ? [{category:'T1H',obsrValue:'5'}] :
      [0,1].flatMap(i=>['TMP','SKY','POP'].map((category,j)=>({category,fcstDate:kst(i),fcstTime:'1200',fcstValue:['9','1','20'][j]})));
    return Response.json({response:{header:{resultCode:'00'},body:{items:{item}}}});
  });
  const [a,b]=await Promise.all([weather('서울특별시'),weather('서울')]);
  assert.equal(calls,2); assert.equal(a.now.temp,5); assert.equal(b.tomorrow.pop,20);
  assert.equal((await weather('없는 지역')).ok,false);
});
