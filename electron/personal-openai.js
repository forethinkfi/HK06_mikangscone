const { buildRequest, readResult, mergeRequest } = require('./ai');

async function request(openai, path, payload, provider = fetch) {
  try {
    if (!openai) throw Error('설정 → AI 연결에서 OpenAI 키를 입력해 주세요.');
    const headers = {Authorization:'Bearer '+openai,'Content-Type':'application/json'};
    if (path === '/status') {
      const res = await provider('https://api.openai.com/v1/models/gpt-4.1-mini',{headers,signal:AbortSignal.timeout(15000)});
      if (!res.ok) throw Error('OpenAI 연결 확인 실패 ('+res.status+')');
      return {ok:true};
    }
    if (path !== '/organize' && path !== '/merge-candidates') throw Error('지원하지 않는 요청이에요.');
    const body = path === '/organize' ? buildRequest(payload) : mergeRequest(payload.notes);
    body.max_output_tokens = 2048;
    const res = await provider('https://api.openai.com/v1/responses',{method:'POST',headers,
      body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
    if (!res.ok) throw Error('OpenAI 메모 정리 요청 실패 ('+res.status+')');
    return {ok:true,result:readResult(await res.json())};
  } catch (e) { return {ok:false,reason:'error',error:e.message}; }
}
module.exports = { request };
