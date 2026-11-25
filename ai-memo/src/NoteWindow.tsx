import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MemoDetail } from './components/MemoDetail';
import { HeartClipDefs } from './components/deco';
import { db } from './db';
import { createMemo } from './data/hooks';
import { organizeMemo, setEventRegistered } from './data/ai';
import { desktop } from './desktop';

/** A page that is just one sticky note in its own desktop window. */
export function NoteWindow({ id }: { id: number }) {
  const [organizing, setOrganizing] = useState(false);
  const [toast, setToast] = useState('');

  const say = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? '' : t)), 4000);
  };

  // null while loading, false once the memo is gone (deleted elsewhere, or before this launch)
  const exists = useLiveQuery(async () => !!(await db.memos.get(id)), [id], null);
  useEffect(() => {
    if (exists === false) desktop?.closeNote(true);
  }, [exists]);

  return (
    <div className="relative h-full">
      <HeartClipDefs />
      <MemoDetail
        id={id}
        mode="window"
        onClose={(deleted) => desktop?.closeNote(deleted)}
        onNew={async () => desktop?.openNote(await createMemo(''))}
        organizing={organizing}
        onOrganize={async (memoId) => {
          setOrganizing(true);
          const err = await organizeMemo(memoId);
          setOrganizing(false);
          say(err ?? '정리했어요 ✦ 찾은 일정은 확인 후 알람 등록해 주세요');
        }}
        onRegister={async (memoId, index, on) => {
          await setEventRegistered(memoId, index, on);
          say(on ? '알람을 등록했어요 ⏰' : '알람을 취소했어요');
        }}
      />
      {toast && (
        <div role="status" className="pointer-events-none absolute right-5 bottom-16 left-5 z-50 rounded-full bg-ink px-3 py-2 text-center text-xs font-semibold text-on-ink shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
