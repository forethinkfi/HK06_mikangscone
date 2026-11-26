const { weatherService } = require('./kma');
const { calendarRoute } = require('./calendar-auth');
const http = require('node:http');
const { openLedger, cost, month } = require('./ledger');
const { buildRequest, readResult, mergeRequest } = require('../electron/ai');
const MAX_OUTPUT = 2048;
const MAX_BYTES = 12 * 1024 * 1024;
function invalid(status, message) { return Object.assign(new Error(message), { status }); }
async function readMemo(req, merge) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) throw invalid(413, '첨부 사진의 크기를 줄여 주세요.');
    chunks.push(chunk);
  }
  let memo;
  try { memo = JSON.parse(Buffer.concat(chunks).toString()); } catch {}
  if (merge) {
    const notes = memo?.notes;
    if (!Array.isArray(notes) || notes.length < 2 || notes.length > 32 ||
        !notes.every(n => typeof n?.title === 'string' && n.title.length <= 100 &&
          typeof n.text === 'string' && n.text.length <= 600)) throw invalid(400, '검토할 메모 목록을 확인해 주세요.');
    return { notes: notes.map(({ title, text }) => ({ title, text })), images: [] };
  }
  if (!memo || typeof memo.text !== 'string' || typeof memo.title !== 'string' ||
      !['memo', 'command'].includes(memo.kind) ||
      !Array.isArray(memo.sections) || !memo.sections.every(s => typeof s === 'string') ||
      !Array.isArray(memo.images) || memo.images.length > 4 ||
      !memo.images.every(s => typeof s === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s))) {
    throw invalid(400, '메모 형식을 확인해 주세요.');
  }
  return memo;
}
function service(ledger, key, provider = fetch) {
  const weather = weatherService(process.env.KMA_SERVICE_KEY, provider);
  return http.createServer(async (req, res) => {
    function send(status, data) {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    }
    try {
      if (req.url.startsWith('/calendar/')) return await calendarRoute(req, send, provider);
      if (req.method === 'GET' && req.url.startsWith('/weather?')) {
        const city = new URL(req.url,'http://localhost').searchParams.get('city');
        const result = await weather(city);
        return send(result.ok ? 200 : 400,result);
      }
      const code = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '')?.[1];
      const id = code && ledger.identify(code);
      if (!id) throw invalid(401, 'AI 이용 코드를 확인해 주세요.');
      if (!key) throw invalid(503,'운영 서버에 OpenAI 키가 필요해요.');
      if (req.method === 'GET' && req.url === '/status') return send(200, { ok: true });
      const merge = req.url === '/merge-candidates';
      if (req.method !== 'POST' || (!merge && req.url !== '/organize')) throw invalid(404, '요청 경로를 확인해 주세요.');
      const memo = await readMemo(req, merge);
      const body = merge ? mergeRequest(memo.notes) : buildRequest(memo);
      body.max_output_tokens = MAX_OUTPUT;
      body.service_tier = 'default';
      // UTF-8 byte count bounds text tokens. Allow for framing and image patches.
      const textBytes = Buffer.byteLength(JSON.stringify({ ...body,
        input: body.input[0].content.filter(p => p.type === 'input_text') }));
      if (textBytes > 100_000) throw invalid(413, '메모를 더 짧게 나누어 주세요.');
      const ceiling = cost(textBytes + 1024 + 4096 * memo.images.length, 0, MAX_OUTPUT);
      const period = month();
      if (!ledger.reserve(id, period, ceiling)) throw invalid(429, '이번 달 AI 잔여 한도가 이 요청에 부족해요.');
      // Keep the reservation if delivery or billing is uncertain (including a crash).
      const upstream = await provider('https://api.openai.com/v1/responses', {
        method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60000), body: JSON.stringify(body),
      });
      if (!upstream.ok) {
        if ([400,401,403,404,413,422,429].includes(upstream.status)) ledger.refund(id, period, ceiling);
        throw invalid(502, 'AI 요청을 완료하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
      }
      const result = await upstream.json();
      const u = result.usage;
      const cached = u?.input_tokens_details?.cached_tokens || 0;
      if (u && [u.input_tokens, cached, u.output_tokens].every(v => Number.isSafeInteger(v) && v >= 0) && cached <= u.input_tokens) {
        ledger.refund(id, period, ceiling - cost(u.input_tokens, cached, u.output_tokens));
      }
      send(200, { ok: true, result: readResult(result) });
    } catch (e) { send(e.status || 502, { ok: false, reason: 'error', error: e.status ? e.message : 'AI 서버에서 정리를 완료하지 못했어요.' }); }
  });
}
if (require.main === module) {
  const db = process.env.MEMO_DB;
  if (!db) throw Error('Set MEMO_DB to a persistent SQLite file path.');
  const ledger = openLedger(db);
  if (process.argv[2] === 'issue') {
    if (!process.argv[3]?.trim()) throw Error('Provide a stable customer ID.');
    console.log(ledger.issue(process.argv[3].trim()));
    ledger.close();
  } else {
    service(ledger, process.env.OPENAI_API_KEY).listen(Number(process.env.PORT || 8787), process.env.HOST || '127.0.0.1');
  }
}
module.exports = { service };
