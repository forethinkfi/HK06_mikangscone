const { DatabaseSync } = require('node:sqlite');
const { createHash, randomBytes } = require('node:crypto');

// Integer nanodollars. Standard GPT-4.1 mini rates per token.
const LIMIT = 1_000_000_000;
function cost(input, cached, output) {
  return 400 * (input - cached) + 100 * cached + 1600 * output;
}
function month(now = new Date()) {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 7);
}
const hash = value => createHash('sha256').update(value).digest('hex');
function openLedger(filename) {
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, digest TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS usage (id TEXT, period TEXT, amount INTEGER NOT NULL,
      PRIMARY KEY(id,period));`);
  return {
    issue(id) {
      const code = randomBytes(32).toString('base64url');
      db.prepare('INSERT INTO customers VALUES (?,?) ON CONFLICT(id) DO UPDATE SET digest=excluded.digest').run(id, hash(code));
      return code;
    },
    identify(code) { return db.prepare('SELECT id FROM customers WHERE digest=?').get(hash(code))?.id; },
    reserve(id, period, amount) {
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > LIMIT) return false;
      return db.prepare(`INSERT INTO usage VALUES (?,?,?) ON CONFLICT(id,period)
        DO UPDATE SET amount=amount+excluded.amount WHERE amount+excluded.amount<=?`).run(id, period, amount, LIMIT).changes === 1;
    },
    refund(id, period, amount) {
      db.prepare('UPDATE usage SET amount=amount-? WHERE id=? AND period=?').run(amount, id, period);
    },
    close() { db.close(); },
  };
}
module.exports = { openLedger, LIMIT, cost, month };
