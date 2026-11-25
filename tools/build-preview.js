// 웹 미리보기 만들기: 데스크톱 앱과 같은 화면 코드(src/)를 "실제 컴퓨터 화면" 예시 안에 넣어 한 장의 HTML로 묶는다.
//   node tools/build-preview.js [출력 경로]   (기본: preview/mikang-preview.html)
// 데스크톱 앱의 window.api(운영체제 기능)를 브라우저용으로 바꿔 끼운다:
//   - 맨 앞 앱 감지 → 예시 화면에서 브라우저 창을 누르면 "웹 사용 중", 바탕화면을 누르면 "바탕화면"
//   - 화면 끝 감지 → 예시 화면의 왼쪽·오른쪽 끝 띠에 마우스를 대면
//   - AI 정리 → claude.ai의 Claude 연결(sample), 음성 메모 → claude.ai 받아쓰기(dictation)
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(ROOT, 'src', p), 'utf8');
const out = process.argv[2] || path.join(ROOT, 'preview', 'mikang-preview.html');

const html = R('index.html');
let stage = html.slice(html.indexOf('<div class="stage side-right" id="stage">'), html.indexOf('<script src="parse.js">'));
stage = stage.slice(0, stage.indexOf('<div class="demo-bg"')) + stage.slice(stage.indexOf('<nav class="dock"'));
const scripts = ['parse.js', 'characters.js', 'cutout.js', 'app.js'];
for (const f of scripts) if (/<\/script/i.test(R(f))) throw new Error('</script> inside ' + f);

const ICON = {
  pc: '<svg viewBox="0 0 48 48"><rect x="6" y="9" width="36" height="24" rx="3" fill="#5aa0e6"/><rect x="9" y="12" width="30" height="18" rx="1.5" fill="#bfe0ff"/><rect x="18" y="35" width="12" height="3" fill="#7c8a99"/><rect x="13" y="38" width="22" height="3" rx="1.5" fill="#9aa7b4"/></svg>',
  folder: '<svg viewBox="0 0 48 48"><path d="M5 13a3 3 0 0 1 3-3h11l4 4h17a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="#f2b636"/><path d="M5 19h38v18a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="#ffd25c"/></svg>',
  trash: '<svg viewBox="0 0 48 48"><path d="M12 14h24l-2 28H14z" fill="#d9e4ee" stroke="#8fa3b6" stroke-width="2"/><rect x="9" y="10" width="30" height="5" rx="2" fill="#a9bccd"/><path d="M20 20v16M28 20v16" stroke="#8fa3b6" stroke-width="2"/></svg>',
  doc: '<svg viewBox="0 0 48 48"><path d="M11 5h18l9 9v29H11z" fill="#fff" stroke="#9fb0c4" stroke-width="1.5"/><path d="M29 5v9h9" fill="#dfe8f2"/><rect x="15" y="20" width="18" height="2.5" fill="#3b7ddd"/><rect x="15" y="26" width="18" height="2" fill="#b8c6d6"/><rect x="15" y="31" width="14" height="2" fill="#b8c6d6"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>',
  start: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8.2" height="8.2" rx="1.5" fill="#3b8be8"/><rect x="12.8" y="3" width="8.2" height="8.2" rx="1.5" fill="#3b8be8"/><rect x="3" y="12.8" width="8.2" height="8.2" rx="1.5" fill="#3b8be8"/><rect x="12.8" y="12.8" width="8.2" height="8.2" rx="1.5" fill="#3b8be8"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  files: '<svg viewBox="0 0 24 24"><path d="M2.5 6.5a2 2 0 0 1 2-2h5l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z" fill="#f2b636"/><path d="M2.5 9.5h19v8a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z" fill="#ffd25c"/></svg>',
  mikang: '<svg viewBox="0 0 24 24"><circle cx="12" cy="14" r="8.5" fill="#f7a23f"/><path d="M13 5.5c1.5-2.5 5-2.6 6-1.4-1.4 2-4.3 2.6-6 1.4z" fill="#86b04a"/><circle cx="9.3" cy="14" r="1.1" fill="#5a2e0e"/><circle cx="14.7" cy="14" r="1.1" fill="#5a2e0e"/></svg>',
  wifi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.7 16a5 5 0 0 1 6.6 0"/><circle cx="12" cy="19.2" r="1.1" fill="currentColor"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
};

const DESKTOP = `
<div class="pc" id="pc">
 <div class="screen" id="screen">
  <div class="wall" id="wall">
    <div class="icons">
      <button type="button" class="dicon">${ICON.pc}<span>내 PC</span></button>
      <button type="button" class="dicon">${ICON.folder}<span>팀 프로젝트</span></button>
      <button type="button" class="dicon">${ICON.doc}<span>회의록_11월.docx</span></button>
      <button type="button" class="dicon">${ICON.trash}<span>휴지통</span></button>
    </div>
    <section class="bwin" id="bwin" aria-label="웹 브라우저 창">
      <div class="btabs">
        <div class="btab on"><span class="fav">${ICON.globe}</span>팀 프로젝트 기획서 · 공유 문서</div>
        <div class="btab"><span class="fav">${ICON.search}</span>회의실 예약</div>
        <div class="bctl">
          <button type="button" id="bMin" aria-label="창 내리기"><svg viewBox="0 0 12 12"><path d="M2 6h8" stroke="currentColor"/></svg></button>
          <button type="button" id="bMax" aria-label="창 크기"><svg viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor"/></svg></button>
          <button type="button" id="bClose" class="x" aria-label="창 닫기"><svg viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor"/></svg></button>
        </div>
      </div>
      <div class="bbar"><span class="nav">‹ › ↻</span><div class="addr">🔒 docs.example.com/team/plan-2026</div></div>
      <article class="bpage">
        <p class="crumb">팀 드라이브 › 2026 상반기 › 기획</p>
        <h1>팀 프로젝트 기획서</h1>
        <p class="meta">최종 수정 11월 25일 · 편집자 3명</p>
        <h2>1. 목표</h2>
        <p>사용자가 하루 동안 흩어지는 메모를 한곳에 모으고, 날짜가 들어간 할 일은 놓치지 않게 알려주는 데스크톱 도구를 만든다.</p>
        <h2>2. 일정</h2>
        <table><tr><th>단계</th><th>기한</th><th>담당</th></tr><tr><td>사용자 인터뷰 정리</td><td>11월 27일</td><td>지수</td></tr><tr><td>와이어프레임 v2</td><td>11월 28일</td><td>민호</td></tr><tr><td>중간 발표</td><td>12월 1일 오전 10시</td><td>전원</td></tr></table>
        <h2>3. 회의 메모</h2>
        <p>다음 회의는 금요일 오후 2시. 회의자료는 내일 12시까지 드라이브에 올리기로 했다. 발표 리허설 시간은 아직 정하지 못했다.</p>
      </article>
    </section>
    <div class="edgehint l" aria-hidden="true"><span>최근 메모</span></div>
    <div class="edgehint r" aria-hidden="true"><span>최근 메모</span></div>
    <aside class="guide" id="guide" aria-label="체험 안내">
      <div class="gh2"><b>귤메모 체험하기</b><button type="button" id="gClose" aria-label="안내 접기">접기</button></div>
      <ol>
        <li><b>웹 쓰는 중</b>: 지금처럼 브라우저를 쓰면 귤 캐릭터만 남아요. 캐릭터를 누르면 책갈피가 나와요.</li>
        <li><b>바탕화면</b>: 브라우저 창의 <b>─</b>를 누르거나 빈 바탕화면을 누르면 책갈피가 모두 펼쳐져요.</li>
        <li><b>화면 끝</b>: 화면 왼쪽 끝(점선 띠)에 마우스를 대면 최근 메모가 나와요. 휠로 넘기고, 떼면 사라져요.</li>
        <li><b>사진</b>: 메모를 열고 <b>사진</b> 버튼으로 내 파일에서 골라 넣어요. 사진을 끌어다 놓거나 붙여넣어도 돼요.</li>
        <li><b>내 캐릭터</b>: 캐릭터를 우클릭 → 설정 → <b>내 사진으로</b>를 고르면 배경을 지워 캐릭터로 만들어요.</li>
      </ol>
    </aside>
  </div>
  ${stage}
 </div>
 <footer class="taskbar" aria-label="작업 표시줄">
   <div class="tb-mid">
     <button type="button" class="tbi" aria-label="시작">${ICON.start}</button>
     <div class="tsearch">${ICON.search}<span>검색</span></div>
     <button type="button" class="tbi on" id="tbBrowser" aria-label="웹 브라우저">${ICON.globe}</button>
     <button type="button" class="tbi" aria-label="파일 탐색기">${ICON.files}</button>
     <button type="button" class="tbi" id="tbMemo" aria-label="귤메모 책갈피 펼치기">${ICON.mikang}</button>
   </div>
   <div class="tray"><span class="ime">한</span><span class="ti">${ICON.wifi}</span><span class="ti">${ICON.sound}</span><div class="clock"><span id="tClock">--:--</span><span id="tDate">----</span></div></div>
 </footer>
</div>`;

const SHIM = `
(function(){
  'use strict';
  var L = {cursor:[],fg:[],display:[],cmd:[],open:[],blur:[]};
  var on = function(k){ return function(fn){ L[k].push(fn); return function(){}; }; };
  var emit = function(k,v){ L[k].forEach(function(f){ try { f(v); } catch(e) { console.error(e); } }); };
  var KEY = 'mikang-preview-v2', audio = new Map();
  var hasClaude = !!(window.claude && typeof window.claude.use === 'function');
  var pSample = hasClaude ? window.claude.use('sample').catch(function(){ return null; }) : Promise.resolve(null);
  var pDict = hasClaude ? window.claude.use('dictation').catch(function(){ return null; }) : Promise.resolve(null);
  var dict = null; pDict.then(function(d){ dict = d; });
  var WD = ['일','월','화','수','목','금','토'];
  function nowText(){ var d = new Date(), p = function(n){ return String(n).padStart(2,'0'); };
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())+' ('+WD[d.getDay()]+'요일)'; }
  var KIND = { memo:'사용자가 직접 쓴 메모', transcript:'말로 한 메모를 받아쓴 글', command:'사용자가 비서에게 한 부탁 (메모로 만들어 줘)' };
  function prompt(p, withImages){
    return '너는 사용자의 바탕화면에 사는 메모 비서 캐릭터야. 아래 메모를 메모지 한 장으로 정리해서 JSON 하나만 출력해. 설명이나 코드블록은 쓰지 마.\\n'
      + '형식: {"keyword":"책갈피 키워드 1개, 한국어 명사 2~6자","title":"제목 20자 이내 또는 빈 문자열","body":"메모지에 적을 정리된 본문. 줄마다 \\'- \\'로 시작","summary":["요점 최대 3개, 각 30자 이내"],"events":[{"title":"할 일 20자 이내","when":"YYYY-MM-DDTHH:mm (현지 시각)","deadline":true/false,"repeat":"none|daily|weekly","all_day":true/false}],"reply":"캐릭터가 말풍선으로 할 1~2문장. 친근한 존댓말, 이모지 없이. 맞춘 알람의 날짜와 시간을 구체적으로"}\\n'
      + '규칙: 오늘·내일·모레·금요일·다음 주 월요일·3일 뒤 같은 표현은 현재 시각 기준 미래 날짜로 계산해. "12시"처럼 오전/오후가 없으면 1~6시는 오후, 12시는 정오. 시간 없이 날짜만 있으면 all_day=true, when은 그날 09:00. "~까지", 마감, 제출은 deadline=true. 날짜가 없으면 events는 빈 배열. 원문에 없는 내용은 지어내지 마.'
      + (withImages ? ' 첨부한 사진 속 글(포스터, 공지, 화이트보드 등)의 날짜와 할 일도 읽어서 정리해.' : '')
      + '\\n현재 시각: ' + nowText() + '\\n종류: ' + (KIND[p.kind] || KIND.memo) + (p.title ? '\\n기존 제목: ' + p.title : '') + '\\n메모:\\n"""\\n' + p.text + '\\n"""';
  }
  function toBlob(d){ var m = /^data:([^;]+);base64,(.*)$/.exec(d); var bin = atob(m[2]), a = new Uint8Array(bin.length); for (var i=0;i<bin.length;i++) a[i] = bin.charCodeAt(i); return new Blob([a], {type:m[1]}); }
  var ERR = { not_granted:'Claude 사용을 허용하지 않아서 기본 규칙으로 정리했어요.', rate_limited:'요청이 많아요. 잠시 뒤에 다시 시도해 주세요.', images_unavailable:'사진은 빼고 글만 정리했어요.' };
  window.api = {
    loadState: async function(){ try { return JSON.parse(localStorage.getItem(KEY)); } catch(e){ return null; } },
    saveState: async function(s){ try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch(e){ return false; } },
    setInteractive: function(){}, focus: function(){}, release: function(){}, openData: function(){}, quit: function(){}, applySettings: function(){},
    notify: function(){},
    info: async function(){ return {platform:'web', demo:true, args:[]}; },
    keyStatus: async function(){ var r = await Promise.all([pSample, pDict]); return {anthropic: !!r[0], openai: !!r[1], builtin: true}; },
    setKey: async function(){ return this.keyStatus(); },
    dictation: function(){ return dict; },
    organize: async function(p){
      var s = await pSample; if (!s) return {ok:false, reason:'nokey'};
      var opts = { modelTier:'quick', cache:false };
      if (p.images && p.images.length) { try { var lim = await s.limits(); if (lim && lim.images) opts.images = p.images.slice(0, lim.images.maxCount || 4).map(toBlob); } catch(e){} }
      try { return {ok:true, result: await s.json(prompt(p, !!opts.images), opts)}; }
      catch(e){ return {ok:false, reason:'error', error: ERR[e && e.code] || 'Claude가 응답하지 않아서 기본 규칙으로 정리했어요.'}; }
    },
    saveAudio: async function(id,buf){ audio.set(id,buf); return true; },
    readAudio: async function(id){ return audio.get(id) || null; },
    deleteAudio: async function(id){ audio.delete(id); return true; },
    transcribe: async function(){ return {ok:false, reason:'nokey'}; },
    askMic: async function(){ return true; },
    onCursor:on('cursor'), onForeground:on('fg'), onDisplay:on('display'), onCommand:on('cmd'), onOpenNote:on('open'), onBlur:on('blur')
  };

  // ── 예시 컴퓨터 화면 ──
  var stageEl = function(){ return document.getElementById('stage'); };
  var EDGE = 12, last = {x:-1, y:-1};
  function rel(e){ var r = stageEl().getBoundingClientRect(); return {x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height}; }
  function edgeOf(p){ if (p.y < 40 || p.y > p.h - 40 || p.x < 0 || p.x > p.w) return null; return p.x <= EDGE ? 'left' : p.x >= p.w - EDGE - 1 ? 'right' : null; }
  document.addEventListener('mousemove', function(e){ if (!stageEl()) return; var p = rel(e); last = p; emit('cursor', {x:p.x, y:p.y, edge:edgeOf(p), on:true}); });
  document.documentElement.addEventListener('mouseleave', function(){
    if (last.x < 0) return; var side = last.x < 60 ? 'left' : last.x > last.w - 60 ? 'right' : null;
    if (side && last.y > 40 && last.y < last.h - 40) emit('cursor', {x: side === 'left' ? 0 : last.w - 1, y:last.y, edge:side, on:true});
  });
  var screenMode = 'app';
  function setScreen(kind){
    screenMode = kind;
    emit('fg', kind === 'app' ? {kind:'app', name:'Browser', browser:true} : {kind:'desktop', name:'Desktop', browser:false});
    document.getElementById('tbBrowser').classList.toggle('on', kind === 'app');
  }
  window.__setScreen = setScreen;
  document.addEventListener('DOMContentLoaded', function(){
    var bwin = document.getElementById('bwin'), wall = document.getElementById('wall');
    var minimize = function(){ bwin.classList.add('min'); setScreen('desktop'); };
    var restore = function(){ bwin.classList.remove('min'); setScreen('app'); };
    wall.addEventListener('mousedown', function(e){
      if (e.target.closest('#guide')) return;
      if (e.target.closest('#bwin')) { if (!e.target.closest('.bctl')) setScreen('app'); }
      else setScreen('desktop');
    });
    document.getElementById('bMin').addEventListener('click', minimize);
    document.getElementById('bClose').addEventListener('click', minimize);
    document.getElementById('bMax').addEventListener('click', function(){ bwin.classList.toggle('max'); });
    document.getElementById('tbBrowser').addEventListener('click', function(){ if (bwin.classList.contains('min')) restore(); else minimize(); });
    document.getElementById('tbMemo').addEventListener('click', function(){ emit('cmd', 'summon'); });
    document.getElementById('gClose').addEventListener('click', function(){ var g = document.getElementById('guide'); g.classList.toggle('folded'); this.textContent = g.classList.contains('folded') ? '펼치기' : '접기'; });
    var tick = function(){ var d = new Date(), h = d.getHours(); document.getElementById('tClock').textContent = (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + ':' + String(d.getMinutes()).padStart(2,'0'); document.getElementById('tDate').textContent = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
    tick(); setInterval(tick, 15000);
    addEventListener('resize', function(){ emit('display', {}); });
    setTimeout(function(){ setScreen('app'); }, 600);
  });
})();`;

const CSS = `
html,body{height:100%;background:#1f2a36}
body{overflow:hidden}
.pc{position:fixed;inset:0;display:grid;grid-template-rows:1fr 48px}
.screen{position:relative;overflow:hidden;min-height:0}
.wall{position:absolute;inset:0;background:
  radial-gradient(1100px 700px at 78% 18%,rgba(255,214,170,.55),transparent 60%),
  radial-gradient(900px 600px at 12% 90%,rgba(150,190,240,.6),transparent 60%),
  linear-gradient(150deg,#9ab6dc 0%,#c4c9e6 45%,#eecfc0 100%)}
.icons{position:absolute;left:14px;top:12px;display:grid;gap:6px}
.dicon{display:grid;justify-items:center;gap:3px;width:84px;padding:6px 4px;border:1px solid transparent;border-radius:6px;background:transparent;color:#fff;font:12px/1.25 'Gowun Dodum','Malgun Gothic',sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.6);cursor:default}
.dicon svg{width:42px;height:42px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))}
.dicon:hover,.dicon:focus{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.3)}
.bwin{position:absolute;left:clamp(110px,10%,200px);top:26px;width:min(760px,calc(100% - 420px));min-width:420px;height:min(78%,640px);display:flex;flex-direction:column;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 22px 50px rgba(20,30,60,.35),0 0 0 1px rgba(0,0,0,.08);transition:transform .28s cubic-bezier(.3,.8,.3,1),opacity .2s}
.bwin.max{left:0;top:0;width:100%;height:100%;border-radius:0;min-width:0}
.bwin.min{transform:translateY(110%) scale(.4);opacity:0;pointer-events:none}
.btabs{display:flex;align-items:flex-end;gap:2px;height:40px;padding:0 0 0 8px;background:#dfe5ee}
.btab{display:flex;align-items:center;gap:7px;height:32px;max-width:240px;padding:0 14px;border-radius:9px 9px 0 0;font-size:12.5px;color:#4a5566;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.btab.on{background:#fff;color:#1d2633}
.btab .fav{width:14px;height:14px;color:#3b7ddd;flex:none}
.bctl{margin-left:auto;display:flex;align-self:stretch}
.bctl button{width:46px;border:0;background:transparent;color:#333;display:grid;place-items:center}
.bctl button svg{width:11px;height:11px}
.bctl button:hover{background:rgba(0,0,0,.08)}
.bctl button.x:hover{background:#e81123;color:#fff}
.bbar{display:flex;align-items:center;gap:10px;height:40px;padding:0 12px;border-bottom:1px solid #e3e7ed}
.bbar .nav{color:#7a8494;letter-spacing:6px;font-size:15px}
.addr{flex:1;height:28px;display:flex;align-items:center;padding:0 12px;border-radius:14px;background:#f1f3f6;color:#4a5566;font-size:12.5px;overflow:hidden;white-space:nowrap}
.bpage{flex:1;overflow:auto;padding:26px clamp(20px,6%,56px);font:14px/1.75 'Gowun Dodum','Malgun Gothic',sans-serif;color:#2b3340}
.bpage h1{font:400 28px/1.3 'Jua',sans-serif;margin:4px 0}
.bpage h2{font-size:15px;margin:18px 0 4px;color:#1d2633}
.bpage p{margin:0 0 6px}
.bpage .crumb,.bpage .meta{font-size:12px;color:#7a8494}
.bpage table{border-collapse:collapse;font-size:13px;margin:4px 0;width:100%;max-width:520px}
.bpage th,.bpage td{border:1px solid #e1e5ea;padding:5px 10px;text-align:left}
.bpage th{background:#f5f7fa;font-weight:400;color:#5b6574}
.edgehint{position:absolute;top:30%;bottom:30%;width:12px;display:grid;place-items:center;pointer-events:none}
.edgehint.l{left:0;border-right:2px dashed rgba(255,255,255,.55)}
.edgehint.r{right:0;border-left:2px dashed rgba(255,255,255,.55)}
.edgehint span{writing-mode:vertical-rl;font:11px 'Gowun Dodum',sans-serif;color:#fff;background:rgba(40,46,58,.55);padding:8px 2px;border-radius:6px;letter-spacing:2px}
.guide{position:absolute;left:14px;bottom:14px;width:min(380px,calc(100% - 140px));padding:12px 14px;border-radius:14px;background:rgba(32,38,48,.88);color:#f4f1ea;font-size:12.5px;line-height:1.5;box-shadow:0 10px 24px rgba(0,0,0,.3);backdrop-filter:blur(8px);z-index:5}
.guide .gh2{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.guide .gh2 b{font:400 15px 'Jua',sans-serif}
.guide .gh2 button{border:1px solid rgba(255,255,255,.3);background:transparent;color:#f4f1ea;border-radius:8px;padding:2px 9px;font-size:12px}
.guide ol{margin:0;padding-left:18px;display:grid;gap:3px}
.guide.folded ol{display:none}
.taskbar{position:relative;z-index:90;display:flex;align-items:center;justify-content:center;padding:0 max(12px,env(safe-area-inset-right,0px)) 0 max(12px,env(safe-area-inset-left,0px));background:rgba(238,242,248,.92);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.6);color:#1d2633}
.tb-mid{display:flex;align-items:center;gap:4px}
.tbi{position:relative;width:40px;height:40px;border:0;border-radius:6px;background:transparent;display:grid;place-items:center;color:#2f6fd0}
.tbi svg{width:22px;height:22px}
.tbi:hover{background:rgba(0,0,0,.06)}
.tbi.on::after{content:'';position:absolute;bottom:3px;left:50%;width:14px;height:3px;margin-left:-7px;border-radius:2px;background:#2f6fd0}
.tsearch{display:flex;align-items:center;gap:8px;width:180px;height:32px;padding:0 12px;border-radius:16px;background:#fff;color:#6b7482;font-size:13px;border:1px solid #dde3ea;margin:0 6px}
.tsearch svg{width:15px;height:15px}
.tray{position:absolute;right:max(12px,env(safe-area-inset-right,0px));display:flex;align-items:center;gap:10px;font-size:12px}
.tray .ti svg{width:16px;height:16px;display:block}
.tray .ime{font-size:12px}
.clock{display:grid;justify-items:end;line-height:1.25;font-variant-numeric:tabular-nums}
@media (max-width:760px){.tsearch,.tray .ti,.tray .ime{display:none}.bwin{left:8px;width:calc(100% - 110px);min-width:0}.icons{display:none}}
/* 앱 화면(오버레이)은 예시 화면 위에 겹쳐 있고, 빈 곳은 아래로 클릭이 지나간다 (데스크톱 앱과 같은 동작) */
#stage{position:absolute;inset:0;height:auto;pointer-events:none;z-index:10}
#stage .dock,#stage .pet,#stage .bubble,#stage .modal,#stage .toast{pointer-events:auto}
#stage .toasts{pointer-events:none}
#stage.dock-hidden .dock{pointer-events:none}
#stage .pet.hide{pointer-events:none}`;

const page = `<title>귤메모 미리보기</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Gowun+Dodum&family=Jua&display=swap" rel="stylesheet">
<style>
${R('styles.css')}
${CSS}
</style>
${DESKTOP}
<script>${SHIM}</script>
${scripts.map((f) => `<script>${R(f)}</script>`).join('\n')}
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log('미리보기를 만들었어요:', out, `(${Math.round(page.length / 1024)}KB)`);
