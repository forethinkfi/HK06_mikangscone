// AI 비서: 메모 정리(Claude)와 녹음 받아쓰기(OpenAI 음성 인식).
// 키는 메인 프로세스에서만 쓰고 화면 코드(렌더러)로는 보내지 않는다.
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-opus-5-5';

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['keyword', 'title', 'body', 'summary', 'events', 'reply', 'section'],
  properties: {
    keyword: { type: 'string', description: '책갈피 탭에 붙일 핵심 키워드 1개. 한국어 명사 2~6자.' },
    title: { type: 'string', description: '메모 제목. 20자 이내. 없으면 빈 문자열.' },
    body: { type: 'string', description: '메모지에 적을 정리된 본문. 줄마다 "- "로 시작하는 짧은 항목. 날짜·시간 표현은 원문대로 남긴다.' },
    summary: { type: 'array', items: { type: 'string' }, description: '요점 최대 3개, 각 30자 이내.' },
    events: {
      type: 'array',
      description: '날짜나 시간이 언급된 할 일/일정. 없으면 빈 배열.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'when', 'deadline', 'repeat', 'all_day'],
        properties: {
          title: { type: 'string', description: '할 일 (20자 이내). 예: 회의자료 제출' },
          when: { type: 'string', description: '현지 시각 YYYY-MM-DDTHH:mm' },
          deadline: { type: 'boolean', description: '"~까지", 마감, 제출처럼 기한이면 true' },
          repeat: { type: 'string', enum: ['none', 'daily', 'weekly'] },
          all_day: { type: 'boolean', description: '시간 언급 없이 날짜만 있으면 true (when은 09:00으로)' },
        },
      },
    },
    section: { type: 'string', description: '아래 "분류 후보" 중 이 메모에 가장 맞는 이름 하나를 그대로. 맞는 게 없거나 후보가 없으면 빈 문자열.' },
    reply: { type: 'string', description: '비서 캐릭터가 말풍선으로 사용자에게 할 한두 문장. 친근한 존댓말, 이모지 없이. 맞춘 알람이 있으면 날짜와 시간을 구체적으로 말한다.' },
  },
};

const SYSTEM = `너는 사용자의 바탕화면에 사는 메모 비서 캐릭터야. 사용자가 적은 메모, 녹음 받아쓰기, 또는 부탁을 받아서 메모지 한 장으로 정리해.
- 상대적인 날짜 표현(오늘, 내일, 모레, 이번 주 금요일, 다음 주 월요일, 3일 뒤 등)은 아래 "현재 시각"을 기준으로 실제 날짜로 계산해. 항상 미래 시점이어야 해.
- "12시"처럼 오전/오후가 없으면 상식적으로 해석해 (1~6시는 보통 오후, 12시는 정오).
- 시간이 없고 날짜만 있으면 all_day=true, when은 그날 09:00.
- 녹음 받아쓰기라면 말버릇·반복을 빼고 결정사항, 할 일, 기억할 내용 위주로 정리해.
- 사진이 함께 오면 사진 속 글(포스터, 공지, 화이트보드, 영수증 등)의 날짜·시간·할 일도 읽어서 정리해.
- 원문에 없는 사실은 지어내지 마.`;

function nowContext() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())} (${wd}요일, ${tz})`;
}

const KIND_LABEL = { memo: '사용자가 직접 쓴 메모', transcript: '녹음을 받아쓴 원문', command: '사용자가 비서에게 한 부탁 (메모로 만들어 줘)' };

/** 메모에 붙은 사진(data:image/jpeg;base64,...)을 Claude 이미지 입력으로 바꾼다. */
function imageBlocks(images) {
  return (Array.isArray(images) ? images : []).slice(0, 4)
    .map((d) => /^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(d)))
    .filter(Boolean)
    .map((m) => ({ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }));
}

/** 메모 정리. 실패하면 예외를 던진다(렌더러가 규칙 기반 정리로 대신한다). */
async function organize(apiKey, { text, title = '', kind = 'memo', images = [], sections = [] }) {
  const client = new Anthropic({ apiKey, timeout: 60000, maxRetries: 1 });
  const user = `현재 시각: ${nowContext()}
종류: ${KIND_LABEL[kind] || KIND_LABEL.memo}
${title ? `기존 제목: ${title}\n` : ''}분류 후보: ${(sections || []).slice(0, 20).join(', ') || '(없음)'}
<memo>
${text}
</memo>`;
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: [...imageBlocks(images), { type: 'text', text: user }] }],
  });
  if (res.stop_reason === 'refusal') throw new Error('AI가 이 메모는 정리하지 않았어요.');
  const txt = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const j = JSON.parse(txt);
  return { ...j, src: 'claude' };
}

/** 녹음 파일 받아쓰기 (OpenAI 음성 인식 API). */
async function transcribe(apiKey, filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1) || 'webm';
  const form = new FormData();
  form.append('file', new Blob([buf], { type: `audio/${ext}` }), `memo.${ext}`);
  form.append('model', 'whisper-1');
  form.append('language', 'ko');
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form,
  });
  if (!r.ok) {
    let msg = `받아쓰기 실패 (${r.status})`;
    try { const e = await r.json(); if (e.error && e.error.message) msg += ': ' + e.error.message; } catch {}
    throw new Error(msg);
  }
  const j = await r.json();
  return String(j.text || '').trim();
}

function describeError(e) {
  if (e instanceof Anthropic.AuthenticationError) return 'Claude API 키가 올바르지 않아요.';
  if (e instanceof Anthropic.RateLimitError) return '요청이 많아 잠시 뒤에 다시 시도해 주세요.';
  if (e instanceof Anthropic.APIConnectionError) return '인터넷 연결을 확인해 주세요.';
  if (e instanceof Anthropic.APIError) return `AI 오류 (${e.status})`;
  return e && e.message ? e.message : String(e);
}

/** 모든 메모를 한눈에 볼 수 있게 요약 (메모 모아보기의 'AI로 전체 요약') */
async function summarizeAll(apiKey, { notes = [] }) {
  const client = new Anthropic({ apiKey, timeout: 90000, maxRetries: 1 });
  const list = notes.slice(0, 80).map((n, i) => `${i + 1}. [${n.section}] ${n.keyword}${n.title ? ' / ' + n.title : ''}\n${String(n.text || '').slice(0, 600)}${n.events && n.events.length ? '\n일정: ' + n.events.join('; ') : ''}`).join('\n\n');
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: '너는 사용자의 메모 비서야. 메모 전체를 한눈에 볼 수 있게 짧게 요약해. 첫 줄은 한 문장 총평. 그다음 줄마다 "- "로 시작하는 항목 3~7개: 급한 일과 마감을 먼저, 각 줄 앞에 [섹션 이름]. 날짜는 "11월 26일(목) 12:00"처럼 구체적으로. 메모에 없는 내용은 쓰지 마. 마크다운 굵게·제목은 쓰지 마.',
    messages: [{ role: 'user', content: `현재 시각: ${nowContext()}\n\n<memos>\n${list}\n</memos>` }],
  });
  if (res.stop_reason === 'refusal') throw new Error('AI가 이 메모들은 요약하지 않았어요.');
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

/** 저장한 키가 실제로 동작하는지 확인 (모델 정보 조회만 하므로 비용이 들지 않는다) */
async function testKey(name, apiKey) {
  if (!apiKey) return { ok: false, error: '저장된 키가 없어요.' };
  try {
    if (name === 'anthropic') {
      const client = new Anthropic({ apiKey, timeout: 20000, maxRetries: 0 });
      await client.models.retrieve(MODEL);
      return { ok: true };
    }
    const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
    if (r.status === 401) return { ok: false, error: 'OpenAI 키가 올바르지 않아요. 키를 다시 복사해 주세요.' };
    if (!r.ok) return { ok: false, error: `OpenAI 연결 실패 (${r.status})` };
    return { ok: true };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, error: 'Claude 키가 올바르지 않아요. sk-ant-로 시작하는 키를 다시 복사해 주세요.' };
    if (e instanceof Anthropic.PermissionDeniedError) return { ok: false, error: '이 키로는 Claude 모델을 쓸 권한이 없어요.' };
    return { ok: false, error: describeError(e) };
  }
}

module.exports = { organize, transcribe, describeError, testKey, summarizeAll };
