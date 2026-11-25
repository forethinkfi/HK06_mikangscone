import { db } from '../db';
import { desktop } from '../desktop';
import type { AiResult, Memo } from '../types';
import { registeredEvents, updateMemo } from './hooks';

const NOT_DESKTOP = 'AI 정리는 데스크톱 앱에서만 돼요. (npm run app 으로 실행)';

/** Send one memo to the main process for AI 정리 and store the result. Returns an error message or null. */
export async function organizeMemo(id: number): Promise<string | null> {
  if (!desktop) return NOT_DESKTOP;
  const memo = await db.memos.get(id);
  if (!memo) return '메모를 찾을 수 없어요.';
  const text = [memo.body, memo.transcript].filter(Boolean).join('\n\n');
  if (!text.trim()) return `"${memo.title}"은 내용이 비어 있어요.`;

  const res = await desktop.organize({ title: memo.title, body: text, kind: memo.kind });
  if (!res.ok) return res.error;
  const r = res.result;

  // keep alarms the user already confirmed when the same event comes back
  const before = memo.ai?.events ?? [];
  const wasRegistered = (title: string, datetime: string) =>
    before.some((e) => e.registered && e.datetime === datetime && e.title === title);
  // keep todo ticks too
  const wasDone = (text: string) => (memo.ai?.todos ?? []).some((t) => t.done && t.text === text);

  const ai: AiResult = {
    summary: r.summary,
    tags: r.tags.slice(0, 3),
    todos: r.todos.map((t) => ({ text: t.text, done: wasDone(t.text) })),
    events: r.events
      .filter((e) => !Number.isNaN(new Date(e.datetime).getTime()))
      .map((e) => ({ title: e.title, datetime: e.datetime.slice(0, 16), registered: wasRegistered(e.title, e.datetime.slice(0, 16)) })),
    decisions: memo.kind === 'meeting' ? r.decisions : undefined,
    organizedAt: Date.now(),
  };
  const patch: Partial<Memo> = { ai, tags: ai.tags };
  // meetings get an auto title; a user's own title is never overwritten
  if (memo.kind === 'meeting' || memo.title === '새 메모') patch.title = r.title || memo.title;
  await updateMemo(id, patch);
  return null;
}

export async function setEventRegistered(memoId: number, index: number, on: boolean) {
  const memo = await db.memos.get(memoId);
  if (!memo?.ai) return;
  const events = memo.ai.events.map((e, i) => (i === index ? { ...e, registered: on } : e));
  await db.memos.update(memoId, { ai: { ...memo.ai, events } });
}

/** Tell the main process about every confirmed, upcoming alarm. */
export function syncAlarms(memos: Memo[]) {
  if (!desktop) return;
  const now = Date.now() - 10 * 60e3;
  const list = registeredEvents(memos)
    .filter((e) => new Date(e.datetime).getTime() >= now)
    .map((e) => ({ key: `${e.memoId}:${e.datetime}:${e.title}`, title: e.title, datetime: e.datetime }));
  desktop.syncAlarms(list);
}
