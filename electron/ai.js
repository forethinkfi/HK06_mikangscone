// AI 비서: 메모 정리(Claude)와 녹음 받아쓰기(OpenAI 음성 인식).
// 키는 메인 프로세스에서만 쓰고 화면 코드(렌더러)로는 보내지 않는다.
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-opus-5-5';

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['keyword', 'title', 'body', 'summary', 'events', 'reply'],
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
    reply: { type: 'string', description: '비서 캐릭터가 말풍선으로 사용자에게 할 한두 문장. 친근한 존댓말, 이모지 없이. 맞춘 알람이 있으면 날짜와 시간을 구체적으로 말한다.' },
  },
};

const SYSTEM = `너는 사용자의 바탕화면에 사는 메모 비서 캐릭터야. 사용자가 적은 메모, 녹음 받아쓰기, 또는 부탁을 받아서 메모지 한 장으로 정리해.
- 상대적인 날짜 표현(오늘, 내일, 모레, 이번 주 금요일, 다음 주 월요일, 3일 뒤 등)은 아래 "현재 시각"을 기준으로 실제 날짜로 계산해. 항상 미래 시점이어야 해.
- "12시"처럼 오전/오후가 없으면 상식적으로 해석해 (1~6시는 보통 오후, 12시는 정오).
- 시간이 없고 날짜만 있으면 all_day=true, when은 그날 09:00.
- 녹음 받아쓰기라면 말버릇·반복을 빼고 결정사항, 할 일, 기억할 내용 위주로 정리해.
- 원문에 없는 사실은 지어내지 마.`;

function nowContext() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())} (${wd}요일, ${tz})`;
}

const KIND_LABEL = { memo: '사용자가 직접 쓴 메모', transcript: '녹음을 받아쓴 원문', command: '사용자가 비서에게 한 부탁 (메모로 만들어 줘)' };

/** 메모 정리. 실패하면 예외를 던진다(렌더러가 규칙 기반 정리로 대신한다). */
async function organize(apiKey, { text, title = '', kind = 'memo' }) {
  const client = new Anthropic({ apiKey, timeout: 60000, maxRetries: 1 });
  const user = `현재 시각: ${nowContext()}
종류: ${KIND_LABEL[kind] || KIND_LABEL.memo}
${title ? `기존 제목: ${title}\n` : ''}<memo>
${text}
</memo>`;
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
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

module.exports = { organize, transcribe, describeError };
