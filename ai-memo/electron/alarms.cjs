// System notifications for alarms the user confirmed. Checked every 20s so long waits and sleep/wake are fine.
const { Notification } = require('electron');

/** @type {{ key: string, title: string, datetime: string }[]} */
let alarms = [];
const fired = new Set();
let timer = null;
let onClick = () => {};

function show(title, body) {
  console.log(`[alarm] ${title} — ${body}`);
  if (!Notification.isSupported()) return false;
  const n = new Notification({ title, body, silent: false });
  n.on('click', () => onClick());
  n.show();
  return true;
}

function tick() {
  const now = Date.now();
  for (const a of alarms) {
    const t = new Date(a.datetime).getTime();
    // fire once, within 10 minutes after the time (skips stale ones after a long sleep)
    if (!fired.has(a.key) && now >= t && now - t < 10 * 60e3) {
      fired.add(a.key);
      const time = new Date(a.datetime).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
      show(`⏰ ${a.title}`, `${time} 일정이에요.`);
    }
  }
}

function start(clickHandler) {
  onClick = clickHandler;
  timer ??= setInterval(tick, 20e3);
}

/** Replace the whole list (the renderer owns the data in IndexedDB). */
function sync(list) {
  alarms = Array.isArray(list) ? list.filter((a) => a && a.key && a.datetime) : [];
  tick();
}

module.exports = { start, sync, show };
