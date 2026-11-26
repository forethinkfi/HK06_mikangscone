const test = require('node:test');
const assert = require('node:assert/strict');
const { openLedger, LIMIT, month, cost } = require('../server/ledger');
const { service } = require('../server');

test('same customer shares a durable monthly limit across requests and rotated codes', async t => {
  const { mkdtempSync, rmSync } = require('node:fs');
  const path = require('node:path');
  const dir = mkdtempSync(path.join(require('node:os').tmpdir(), 'memo-budget-'));
  const file = path.join(dir, 'ledger.sqlite');
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  let db = openLedger(file);
  const token = db.issue('customer');
  assert.equal(db.identify(token), 'customer');
  assert.equal(db.reserve('customer', '2026-11', LIMIT - 100), true);
  db.close();
  db = openLedger(file);
  try {
    const fresh = db.issue('customer');
    assert.equal(db.identify(token), undefined);
    assert.equal(db.identify(fresh), 'customer');
    assert.equal(db.reserve('customer', '2026-11', 101), false);
    assert.equal(db.reserve('customer', '2026-11', 100), true);
    assert.equal(db.reserve('customer', '2026-12', LIMIT), true);
    assert.equal(month(new Date('2026-11-30T15:00:00Z')), '2026-12');
  } finally { db.close(); }
});

test('organizer authenticates, settles actual tokens and blocks over-budget calls before provider', async () => {
  const db = openLedger(':memory:');
  const code = db.issue('customer');
  let calls = 0;
  const app = service(db, 'test', async (_url, options) => {
    assert.equal(JSON.parse(options.body).max_output_tokens, 2048);
    calls++;
    return Response.json({ status: 'completed', usage: { input_tokens: 80, input_tokens_details: { cached_tokens: 10 }, output_tokens: 20 },
      output: [{ content: [{ type: 'output_text', text: '{"section":"여행"}' }] }] });
  });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + app.address().port + '/organize';
  const request = token => fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token },
    body: JSON.stringify({ text: '여행', title: '', kind: 'memo', sections: [], images: [] }) });
  try {
    assert.equal((await request('invalid')).status, 401);
    assert.equal((await (await request(code)).json()).result.section, '여행');
    assert.equal(db.reserve('customer', month(), LIMIT - cost(80, 10, 20)), true);
    assert.equal((await request(code)).status, 429);
    const merge = () => fetch(url.replace('/organize', '/merge-candidates'), {
      method: 'POST', headers: { Authorization: 'Bearer ' + code },
      body: JSON.stringify({ notes: [{ title: '여행', text: '항공권 예약' }, { title: '항공권', text: '항공권 예약' }] }),
    });
    assert.equal((await merge()).status, 429);
    assert.equal(calls, 1);
  } finally { await new Promise(resolve => app.close(resolve)); db.close(); }
});
