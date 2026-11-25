import { useEffect, useMemo, useState } from 'react';
import { AssistantCard } from './components/cards/AssistantCard';
import { ScheduleCard } from './components/cards/ScheduleCard';
import { MemoListCard } from './components/cards/MemoListCard';
import { AiCard, DateCard, RecordCard } from './components/cards/SmallCards';
import { HeartClipDefs, SparkleBurst } from './components/deco';
import { BookmarkTab } from './components/BookmarkTab';
import { MemoDetail } from './components/MemoDetail';
import { Settings } from './components/Settings';
import { AlarmList } from './components/AlarmList';
import { BackIcon } from './components/icons';
import { createMemo, registeredEvents, sameDay, useMemos, useRecordedSeconds } from './data/hooks';
import { organizeMemo, setEventRegistered, syncAlarms } from './data/ai';
import { seedIfEmpty } from './data/seed';
import { useRecorder } from './data/recorder';
import { useTheme } from './theme/ThemeProvider';
import { desktop, isDesktop } from './desktop';

type Sheet = { kind: 'memo'; id: number } | { kind: 'settings' } | { kind: 'alarms' } | null;

export default function App() {
  const { theme } = useTheme();
  const memos = useMemos();
  const recorded = useRecordedSeconds();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [open, setOpenState] = useState(false);
  const [burst, setBurst] = useState(0);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState('');
  const [aiStatus, setAiStatus] = useState<{ hasKey: boolean; model: string } | null>(null);

  const say = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? '' : t)), 4500);
  };

  // on the desktop every memo opens as its own sticky-note window; in a browser, inside the panel
  const openMemo = (id: number) => {
    if (desktop) desktop.openNote(id);
    else setSheet({ kind: 'memo', id });
  };

  const recorder = useRecorder({
    onMeeting: async (id) => {
      openMemo(id);
      await runOrganize([id]);
    },
    onError: say,
  });

  const setOpen = async (o: boolean) => {
    // grow the window before showing the panel; shrink it after hiding the panel
    if (o) {
      await desktop?.setOpen(true);
      setOpenState(true);
      setBurst((b) => b + 1);
    } else {
      setSheet(null);
      setOpenState(false);
      await desktop?.setOpen(false);
    }
  };

  useEffect(() => {
    seedIfEmpty();
    desktop?.initialOpen().then((o) => {
      if (o) setOpen(true);
    });
    desktop?.aiStatus().then(setAiStatus);
    return desktop?.onRequestOpen(() => setOpen(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !recorder.recording && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, recorder.recording]); // eslint-disable-line react-hooks/exhaustive-deps

  // empty space in the open panel is see-through: pass clicks there to the app behind
  useEffect(() => {
    if (!desktop || !open) return;
    const SOLID = '.card, button, input, textarea, select, label, a, [data-solid], [role=status], [role=dialog] details';
    let through = false;
    const onMove = (e: MouseEvent) => {
      const t = e.target as Element | null;
      const next = !t?.closest(SOLID);
      if (next !== through) {
        through = next;
        desktop!.setPassthrough(next);
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      desktop!.setPassthrough(false);
    };
  }, [open]);

  // the main process owns the timers; hand it the confirmed alarms whenever memos change
  useEffect(() => syncAlarms(memos), [memos]);

  const events = useMemo(() => registeredEvents(memos), [memos]);
  const today = new Date();
  const todayEvents = events.filter((e) => sameDay(e.datetime, today));
  const upcoming = events.filter((e) => new Date(e.datetime) >= today);
  const todos = memos.flatMap((m) => m.ai?.todos ?? []);
  const todoDone = todos.filter((t) => t.done).length;
  const next = upcoming[0];

  const briefing =
    todayEvents.length || todos.length
      ? `오늘 일정 ${todayEvents.length}개, 남은 할 일 ${todos.length - todoDone}개${next ? ` · 다음은 ${next.title}` : ''}`
      : '오늘은 여유로운 하루예요. 생각나는 걸 적어 두세요!';

  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function runOrganize(ids: number[]) {
    setBusy((b) => new Set([...b, ...ids]));
    const errors: string[] = [];
    // one memo at a time keeps it simple and cheap to retry
    for (const id of ids) {
      const err = await organizeMemo(id);
      if (err) errors.push(err);
      setBusy((b) => {
        const n = new Set(b);
        n.delete(id);
        return n;
      });
    }
    if (errors.length) say(errors[0]);
    else {
      say(ids.length > 1 ? `메모 ${ids.length}개를 정리했어요 ✦` : '정리했어요 ✦ 찾은 일정은 확인 후 알람 등록해 주세요');
      setSelected(new Set());
    }
  }

  const register = async (memoId: number, index: number, on: boolean) => {
    await setEventRegistered(memoId, index, on);
    say(on ? '알람을 등록했어요 ⏰' : '알람을 취소했어요');
  };

  if (!open) {
    return (
      <div className={isDesktop ? 'h-full' : 'app-bg flex h-full items-start pt-[28vh]'}>
        <BookmarkTab todayCount={todayEvents.length} onOpen={() => setOpen(true)} />
      </div>
    );
  }

  return (
    <div className="panel-bg relative flex h-full w-[420px] flex-col overflow-hidden">
      <HeartClipDefs />
      <SparkleBurst trigger={burst} />
      <button
        onClick={() => setOpen(false)}
        className="hover-pop absolute top-3 left-3 z-30 inline-flex h-7 items-center gap-0.5 rounded-full bg-ink pr-3 pl-1.5 text-xs font-bold text-on-ink shadow"
        title="접기 (Esc)"
      >
        <BackIcon width={15} height={15} /> 접기
      </button>

      {/* with no backdrop, an open sheet would show the dashboard through it – so hide the dashboard */}
      <main className={`scroll-y panel-in flex-1 space-y-3.5 px-3 pt-12 pb-6 ${sheet ? 'invisible' : ''}`}>
        <AssistantCard
          briefing={briefing}
          todoDone={todoDone}
          todoTotal={todos.length}
          alarmCount={upcoming.length}
          onSend={async (t) => {
            await createMemo(t);
            say('메모를 저장했어요');
          }}
          onBell={() => setSheet({ kind: 'alarms' })}
          onSettings={() => setSheet({ kind: 'settings' })}
        />
        <ScheduleCard events={events} onOpenMemo={openMemo} />
        <MemoListCard
          memos={memos}
          selected={selected}
          onToggleSelect={toggle}
          onOpen={openMemo}
          onNew={async () => openMemo(await createMemo(''))}
        />
        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-3.5">
            <DateCard />
            <RecordCard
              recording={recorder.recording}
              elapsed={recorder.elapsed}
              totalSeconds={recorded}
              stage={recorder.stage}
              onToggle={recorder.toggle}
            />
          </div>
          <AiCard selectedCount={selected.size} busy={busy.size > 0} onRun={() => runOrganize([...selected])} />
        </div>
      </main>

      {sheet?.kind === 'memo' && (
        <MemoDetail
          key={sheet.id}
          id={sheet.id}
          onClose={() => setSheet(null)}
          onNew={async () => setSheet({ kind: 'memo', id: await createMemo('') })}
          organizing={busy.has(sheet.id)}
          onOrganize={(id) => runOrganize([id])}
          onRegister={register}
        />
      )}
      {sheet?.kind === 'settings' && (
        <Settings
          onClose={() => setSheet(null)}
          status={
            <>
              <p>
                AI 연결:{' '}
                <b>{!isDesktop ? '데스크톱 앱에서만 사용' : aiStatus?.hasKey ? `연결됨 (${aiStatus.model})` : '.env에 키 없음'}</b>
              </p>
              <p className="text-xs text-muted">API 키는 앱 폴더의 .env 파일에만 넣어요. 화면에는 저장하지 않아요.</p>
              {isDesktop && (
                <button
                  onClick={() => desktop!.testAlarm()}
                  className="hover-pop mt-1 h-9 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink"
                >
                  알림 테스트
                </button>
              )}
            </>
          }
        />
      )}
      {sheet?.kind === 'alarms' && (
        <AlarmList
          events={upcoming}
          onClose={() => setSheet(null)}
          onOpenMemo={openMemo}
          onCancel={(m, i) => register(m, i, false)}
        />
      )}

      {toast && (
        <div role="status" className="slide-in pointer-events-none absolute right-3 bottom-4 left-3 z-50 rounded-full bg-ink px-4 py-3 text-center text-sm font-semibold text-on-ink shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
