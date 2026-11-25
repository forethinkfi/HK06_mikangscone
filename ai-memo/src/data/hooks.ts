import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Memo, MemoEvent } from '../types';

export function useMemos(): Memo[] {
  return useLiveQuery(() => db.memos.orderBy('updatedAt').reverse().toArray(), [], []);
}

export function useMemo_(id: number | null) {
  return useLiveQuery(() => (id == null ? undefined : db.memos.get(id)), [id]);
}

export function useImages(memoId: number | null) {
  return useLiveQuery(() => (memoId == null ? [] : db.images.where('memoId').equals(memoId).toArray()), [memoId], []);
}

export function useRecordedSeconds(): number {
  return useLiveQuery(async () => (await db.recordings.toArray()).reduce((s, r) => s + r.seconds, 0), [], 0);
}

export interface ScheduledEvent extends MemoEvent {
  memoId: number;
  index: number;
}

/** Every alarm the user confirmed, soonest first. */
export function registeredEvents(memos: Memo[]): ScheduledEvent[] {
  return memos
    .flatMap((m) => (m.ai?.events ?? []).map((e, index) => ({ ...e, memoId: m.id!, index })))
    .filter((e) => e.registered)
    .sort((a, b) => a.datetime.localeCompare(b.datetime));
}

export function sameDay(iso: string, d: Date) {
  const e = new Date(iso);
  return e.getFullYear() === d.getFullYear() && e.getMonth() === d.getMonth() && e.getDate() === d.getDate();
}

export async function createMemo(text: string): Promise<number> {
  const clean = text.trim();
  const firstLine = clean.split('\n')[0];
  const title = firstLine.length > 28 ? firstLine.slice(0, 28) + '…' : firstLine;
  const now = Date.now();
  return (await db.memos.add({ title: title || '새 메모', body: clean, tags: [], kind: 'memo', createdAt: now, updatedAt: now })) as number;
}

export function updateMemo(id: number, patch: Partial<Memo>) {
  return db.memos.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteMemo(id: number) {
  await db.transaction('rw', db.memos, db.images, async () => {
    await db.images.where('memoId').equals(id).delete();
    await db.memos.delete(id);
  });
}

export function addImage(memoId: number, blob: Blob) {
  return db.images.add({ memoId, blob, createdAt: Date.now() });
}

export function removeImage(id: number) {
  return db.images.delete(id);
}

export const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
};
export const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' });
};
export const fmtDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}시간 ${m}분` : `${m}분`;
};
