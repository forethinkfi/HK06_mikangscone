import { useLiveQuery } from 'dexie-react-hooks';
import { db, putSetting } from '../db';

/** A single persisted setting, live across components. */
export function useSetting<T>(key: string, fallback: T): [T, (v: T) => void] {
  const row = useLiveQuery(() => db.settings.get(key), [key]);
  const value = row ? (row.value as T) : fallback;
  return [value, (v: T) => void putSetting(key, v)];
}
