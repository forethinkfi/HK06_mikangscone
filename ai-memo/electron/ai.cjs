// AI 정리: runs only in the Electron main process. The key comes from .env (ANTHROPIC_API_KEY).
const { Anthropic } = require('@anthropic-ai/sdk');

const MODEL = 'claude-opus-5-5';

/** JSON shape the model must return (structured outputs). */
const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '메모 내용을 대표하는 짧은 제목 (20자 이내)' },
    summary: { type: 'string', description: '한두 문장 요약' },
    tags: { type: 'array', items: { type: 'string' }, description: '1~3개의 짧은 분류 태그, # 없이' },
    todos: {
      type: 'array',
      items: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
        additionalProperties: false,
      },
    },
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          datetime: { type: 'string', description: '현지 시각 YYYY-MM-DDTHH:mm' },
        },
        required: ['title', 'datetime'],
        additionalProperties: false,
      },
    },
    decisions: { type: 'array', items: { type: 'string' }, description: '회의록일 때 결정사항. 일반 메모면 빈 배열' },
  },
  required: ['title', 'summary', 'tags', 'todos', 'events', 'decisions'],
  additionalProperties: false,
};

const SYSTEM = `너는 바쁜 직장인의 메모를 정리해 주는 비서야. 사용자가 적은 메모(또는 회의 받아쓰기)를 읽고 정해진 JSON으로만 답해.
- summary: 핵심만 한두 문장, 한국어.
- todos: 사용자가 해야 할 일만. 이미 끝난 일이나 단순 사실은 넣지 마.
- events: 날짜나 시간이 드러난 약속·회의·마감만. "내일", "다음 주 화요일" 같은 상대 표현은 요청에 함께 주는 현재 시각을 기준으로 실제 날짜로 바꿔. 시간이 없으면 09:00으로 둬. 확실하지 않으면 넣지 마.
- decisions: 회의에서 정해진 사항. 일반 메모면 빈 배열.
- 메모에 없는 내용을 지어내지 마.`;

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();
  return client;
}

function status() {
  return { hasKey: !!process.env.ANTHROPIC_API_KEY, model: MODEL };
}

function nowContext() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())} (${days[d.getDay()]}요일, ${tz})`;
}

/**
 * @param {{ title: string, body: string, kind: 'memo' | 'meeting' }} memo
 * @returns {Promise<{ ok: boolean, result?: object, error?: string }>}
 */
async function organize(memo) {
  if (process.env.AI_MEMO_FAKE_AI === '1') return fakeOrganize(memo);
  const c = getClient();
  if (!c) return { ok: false, error: '.env에 ANTHROPIC_API_KEY가 없어요. 키를 넣고 앱을 다시 켜 주세요.' };
  const kindLabel = memo.kind === 'meeting' ? '회의 받아쓰기' : '메모';
  try {
    const res = await c.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // fall back to another model automatically if this one declines
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `현재 시각: ${nowContext()}\n종류: ${kindLabel}\n제목: ${memo.title}\n\n${memo.body}`,
        },
      ],
    });
    if (res.stop_reason === 'refusal') return { ok: false, error: 'AI가 이 메모는 정리할 수 없다고 했어요.' };
    if (res.stop_reason === 'max_tokens') return { ok: false, error: '메모가 너무 길어서 정리가 중간에 끊겼어요.' };
    const text = res.content.find((b) => b.type === 'text');
    if (!text) return { ok: false, error: 'AI 응답이 비어 있어요.' };
    return { ok: true, result: JSON.parse(text.text) };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

function describeError(e) {
  if (e instanceof Anthropic.AuthenticationError) return 'API 키가 올바르지 않아요. .env의 ANTHROPIC_API_KEY를 확인해 주세요.';
  if (e instanceof Anthropic.RateLimitError) return '요청이 많아 잠시 막혔어요. 조금 뒤에 다시 눌러 주세요.';
  if (e instanceof Anthropic.APIConnectionError) return '인터넷 연결을 확인해 주세요.';
  if (e instanceof Anthropic.APIError) return `AI 오류 (${e.status}): ${e.message}`;
  if (e instanceof SyntaxError) return 'AI 응답을 읽지 못했어요. 다시 시도해 주세요.';
  return String(e && e.message ? e.message : e);
}

/** Dev-only (AI_MEMO_FAKE_AI=1): same JSON shape without calling the API, for testing the screens and alarms. */
async function fakeOrganize(memo) {
  await new Promise((r) => setTimeout(r, 600));
  const p = (n) => String(n).padStart(2, '0');
  const at = (d) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  const soon = new Date(Date.now() + 60e3);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);
  const meeting = memo.kind === 'meeting';
  return {
    ok: true,
    result: {
      title: meeting ? '신규 캠페인 회의' : memo.title,
      summary: `(테스트 응답) ${memo.body.split('\n')[0].slice(0, 60)}`,
      tags: meeting ? ['회의', '캠페인'] : ['테스트'],
      todos: [{ text: '시안 확인하기' }, { text: '비용표 공유' }],
      events: [
        { title: '1분 뒤 알람 테스트', datetime: at(soon) },
        { title: '디자인 중간 리뷰', datetime: at(tomorrow) },
      ],
      decisions: meeting ? ['광고 채널은 인스타 위주', '예산은 지난 분기와 동일'] : [],
    },
  };
}

module.exports = { organize, status };
