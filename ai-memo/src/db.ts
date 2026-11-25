import Dexie, { type EntityTable } from 'dexie';
import type { Memo, MemoImage } from './types';

export interface Setting {
  key: string;
  value: unknown;
}

export interface Recording {
  id?: number;
  seconds: number;
  createdAt: number;
}

export const db = new Dexie('ai-memo') as Dexie & {
  memos: EntityTable<Memo, 'id'>;
  images: EntityTable<MemoImage, 'id'>;
  settings: EntityTable<Setting, 'key'>;
  recordings: EntityTable<Recording, 'id'>;
};

db.version(1).stores({
  memos: '++id, updatedAt, kind',
  images: '++id, memoId',
  settings: 'key',
  recordings: '++id, createdAt',
});

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row ? (row.value as T) : fallback;
}

export function putSetting(key: string, value: unknown) {
  return db.settings.put({ key, value });
}
