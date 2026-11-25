/* 메모 글에서 키워드·요점·일정(날짜/시간)을 찾아내는 규칙 기반 분석기.
 * AI 키가 없을 때의 기본 정리이자, AI 결과를 검증하는 데에도 쓴다.
 * 브라우저(window.MemoParse)와 Node(require) 양쪽에서 동작한다. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MemoParse = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const DAYMS = 86400000;
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const pad = (n) => String(n).padStart(2, '0');
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fmtTime = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());

  function fmtWhen(at, now = new Date()) {
    const d = new Date(at), diff = Math.round((startOfDay(d) - startOfDay(now)) / DAYMS), t = fmtTime(d);
    if (diff === 0) return '오늘 ' + t;
    if (diff === 1) return '내일 ' + t;
    if (diff === 2) return '모레 ' + t;
    if (diff === -1) return '어제 ' + t;
    if (diff > 2 && diff < 7) return WD[d.getDay()] + '요일 ' + t;
    return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]}) ${t}`;
  }
  function fmtIn(ms) {
    const m = Math.round(ms / 60000);
    if (m < 1) return '곧';
    if (m < 60) return m + '분 뒤';
    const hh = Math.floor(m / 60);
    if (hh < 24) return hh + '시간 ' + (m % 60 ? (m % 60) + '분 ' : '') + '뒤';
    return Math.floor(hh / 24) + '일 뒤';
  }
  const fmtDate = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일(${WD[d.getDay()]})`;
  const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${fmtTime(d)}`;

  const KWDICT = [['회의자료', '회의자료'], ['회의', '회의'], ['미팅', '미팅'], ['발표', '발표'], ['마감', '마감'], ['제출', '제출'], ['시험', '시험'], ['면접', '면접'], ['병원', '병원'], ['치과', '치과'], ['약속', '약속'], ['생일', '생일'], ['장보기', '장보기'], ['마트', '장보기'], ['사야', '장보기'], ['공부', '공부'], ['과제', '과제'], ['운동', '운동'], ['여행', '여행'], ['예약', '예약'], ['결제', '결제'], ['택배', '택배'], ['청소', '청소'], ['아이디어', '아이디어'], ['비밀번호', '비밀번호']];
  const PARTICLE = /(으로|에서|에게|까지|부터|하기|들|을|를|은|는|이|가|에|의|도|만|로|와|과)$/;
  const stripBullet = (l) => l.replace(/^\s*(?:[-–•·*]|\d+[.)])\s+/, '').trim();

  function guessKeyword(text, title) {
    const all = (title ? title + '\n' : '') + (text || '');
    for (const [k, v] of KWDICT) if (all.includes(k)) return v;
    const src = (title || all).split(/\n/)[0].trim();
    const tok = (src.split(/[\s,/]+/).filter(Boolean)[0] || '').replace(PARTICLE, '');
    return (tok || '메모').slice(0, 6);
  }
  function summarize(text) {
    let lines = (text || '').split(/\n+/).map(stripBullet).filter(Boolean);
    if (lines.length === 1 && lines[0].length > 40) lines = lines[0].split(/[.!?]\s+/).filter(Boolean);
    return lines.slice(0, 3).map((l) => (l.length > 32 ? l.slice(0, 31) + '…' : l));
  }

  const DROP = new Set(['에', '까지', '부터', '쯤', '정도', '에는', '엔', '마다', '전에', '전까지', '안에', '이내']);
  const DATE_RE = /모레|내일|오늘|글피|(다음\s*달|다음달)\s*\d{1,2}\s*일|\d+\s*일\s*(뒤|후)|\d+\s*(시간|분)\s*(뒤|후)|(다음\s*주|담주|이번\s*주)?\s*(주말|[일월화수목금토]요일)|\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}\/\d{1,2}|(오전|오후|아침|저녁|점심|밤|새벽)?\s*\d{1,2}\s*시(?!간)(\s*\d{1,2}\s*분|\s*반)?|\d{1,2}:\d{2}|정오|자정/g;

  /** 한 줄(문장)에서 일정 하나를 찾는다. 없으면 null. */
  function parseLine(line, now) {
    const today = startOfDay(now);
    let d = null, rolling = false, mm, relMs = null;
    if ((mm = line.match(/(\d+)\s*(시간|분)\s*(뒤|후)/))) relMs = +mm[1] * (mm[2] === '시간' ? 3600000 : 60000);
    else if (/글피/.test(line)) d = addDays(today, 3);
    else if (/모레/.test(line)) d = addDays(today, 2);
    else if (/내일/.test(line)) d = addDays(today, 1);
    else if (/오늘/.test(line)) d = today;
    else if ((mm = line.match(/(\d+)\s*일\s*(뒤|후)/))) d = addDays(today, +mm[1]);
    else if ((mm = line.match(/(?:다음\s*달|다음달)\s*(\d{1,2})\s*일/))) d = new Date(now.getFullYear(), now.getMonth() + 1, +mm[1]);
    else if ((mm = line.match(/(다음\s*주|담주|이번\s*주)?\s*(주말|([일월화수목금토])요일)/))) {
      const t = mm[2] === '주말' ? 6 : WD.indexOf(mm[3]), pre = mm[1] || '';
      if (pre) { const mon = addDays(today, -((today.getDay() + 6) % 7)); d = addDays(mon, ((t + 6) % 7) + (/다음|담/.test(pre) ? 7 : 0)); }
      else { d = addDays(today, (t - today.getDay() + 7) % 7); rolling = true; }
    } else if ((mm = line.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/))) { d = new Date(now.getFullYear(), +mm[1] - 1, +mm[2]); if (d < today) d.setFullYear(d.getFullYear() + 1); }
    else if ((mm = line.match(/(?:^|[^\d])(\d{1,2})\/(\d{1,2})(?!\d)/))) { d = new Date(now.getFullYear(), +mm[1] - 1, +mm[2]); if (d < today) d.setFullYear(d.getFullYear() + 1); }

    let hr = null, mi = 0;
    const tm = line.match(/(오전|오후|아침|저녁|점심|밤|새벽)?\s*(\d{1,2})\s*시(?!간)(?:\s*(\d{1,2})\s*분|\s*(반))?/);
    const tc = !tm && line.match(/(?:^|[^\d])(\d{1,2}):(\d{2})(?!\d)/);
    if (relMs == null) {
      if (tm) {
        const mer = tm[1]; hr = +tm[2]; mi = tm[3] ? +tm[3] : tm[4] ? 30 : 0;
        if (mer && /오후|저녁|밤/.test(mer) && hr < 12) hr += 12;
        else if (mer && /오전|아침|새벽/.test(mer) && hr === 12) hr = 0;
        else if (mer === '점심' && hr <= 5) hr += 12;
        else if (!mer && hr >= 1 && hr <= 6) hr += 12; // "3시 회의" → 오후 3시로 본다
      } else if (tc) { hr = +tc[1]; mi = +tc[2]; }
      else if (/정오/.test(line)) hr = 12;
      else if (/자정/.test(line)) { hr = 23; mi = 59; }
      else if (d && (mm = line.match(/아침|점심|저녁|밤|새벽/))) hr = { 아침: 8, 점심: 12, 저녁: 18, 밤: 21, 새벽: 6 }[mm[0]];
    }
    if (relMs == null && !d && hr == null) return null;
    if (hr != null && (hr > 23 || mi > 59)) return null;

    let at;
    if (relMs != null) at = new Date(now.getTime() + relMs);
    else {
      at = d ? new Date(d) : new Date(today);
      at.setHours(hr == null ? 9 : hr, mi, 0, 0);
      if (!d && at < now) at = addDays(at, 1);
      else if (rolling && at < now) at = addDays(at, 7);
    }
    if (at.getTime() < now.getTime() - 60000) return null;

    const deadline = /까지|마감|제출|전까지|이내/.test(line);
    const title = line.replace(DATE_RE, ' ')
      .split(/\s+/).filter((t) => t && !DROP.has(t)).join(' ')
      .replace(/^(까지|에|는|은)\s*/, '')
      .replace(/^[\s,·:\-–]+|[\s,·:\-–]+$/g, '').slice(0, 26) || '일정';
    return { title, at: at.getTime(), repeat: /매일/.test(line) ? 'daily' : /매주/.test(line) ? 'weekly' : 'none', deadline, allDay: hr == null && relMs == null };
  }

  function parseEvents(text, now = new Date()) {
    const out = [];
    const lines = (text || '').split(/\n+/).flatMap((l) => l.split(/[.!?]\s+/)).map(stripBullet).filter(Boolean);
    for (const line of lines) {
      const ev = parseLine(line, now);
      if (ev && !out.some((o) => o.at === ev.at && o.title === ev.title)) out.push(ev);
    }
    return out;
  }

  /** 받아쓰기 원문을 메모 본문 모양으로 다듬는다 (AI가 없을 때). */
  function tidyTranscript(t) {
    return (t || '').replace(/\s+/g, ' ').split(/(?<=[.!?。])\s+|(?<=(?:요|다|죠|까))\s+(?=[가-힣A-Za-z0-9])/)
      .map((s) => s.trim()).filter(Boolean).map((s) => '- ' + s).join('\n');
  }

  function localAnalyze(text, title, now = new Date()) {
    return { keyword: guessKeyword(text, title), summary: summarize(text), events: parseEvents((title ? title + '\n' : '') + text, now), src: 'local' };
  }

  return { DAYMS, WD, pad, startOfDay, addDays, fmtTime, fmtWhen, fmtIn, fmtDate, isoLocal, guessKeyword, summarize, parseLine, parseEvents, tidyTranscript, localAnalyze, stripBullet };
});
