export interface Todo {
  text: string;
  done: boolean;
}

export interface MemoEvent {
  title: string;
  /** ISO 8601 local date-time, e.g. 2026-11-26T15:00 */
  datetime: string;
  /** true once the user pressed "알람 등록" */
  registered: boolean;
}

export interface AiResult {
  summary: string;
  tags: string[];
  todos: Todo[];
  events: MemoEvent[];
  /** meeting minutes only */
  decisions?: string[];
  organizedAt: number;
}

export interface Memo {
  id?: number;
  title: string;
  /** plain text (what AI 정리 and the list read) */
  body: string;
  /** formatted text from the note editor (bold, italic, lists…); falls back to body */
  html?: string;
  tags: string[];
  /** custom colour (Pro) – falls back to theme memo colours */
  color?: string;
  kind: 'memo' | 'meeting';
  transcript?: string;
  /** true while 받아쓰기 is the preview sample (no real STT connected yet) */
  transcriptPreview?: boolean;
  /** seconds of audio this memo was made from */
  audioSeconds?: number;
  ai?: AiResult;
  createdAt: number;
  updatedAt: number;
}

export interface MemoImage {
  id?: number;
  memoId: number;
  blob: Blob;
  createdAt: number;
}

/** "정리 상태(%)": 0 before AI 정리, 50 right after, rising to 100 as its todos get done. */
export function organizedPercent(m: Memo): number {
  if (!m.ai) return 0;
  const todos = m.ai.todos;
  if (todos.length === 0) return 100;
  const done = todos.filter((t) => t.done).length;
  return Math.round(50 + (50 * done) / todos.length);
}
