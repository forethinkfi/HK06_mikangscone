import { SlideOver } from './SlideOver';
import { Card } from './ui';
import { AlarmIcon, CloseIcon } from './icons';
import { fmtDateTime, type ScheduledEvent } from '../data/hooks';

export function AlarmList({
  events,
  onClose,
  onOpenMemo,
  onCancel,
}: {
  events: ScheduledEvent[];
  onClose: () => void;
  onOpenMemo: (id: number) => void;
  onCancel: (memoId: number, index: number) => void;
}) {
  return (
    <SlideOver title="알람" onClose={onClose}>
      <Card bodyClass="p-4">
        <p className="text-xs text-muted">등록한 일정이 시간이 되면 시스템 알림으로 알려 드려요. 앱이 켜져 있어야 해요.</p>
        <ul className="mt-3 space-y-2">
          {events.length === 0 && <li className="rounded-2xl bg-surface-alt p-3 text-sm text-muted">다가오는 알람이 없어요.</li>}
          {events.map((e) => (
            <li key={`${e.memoId}-${e.index}`} className="flex items-center gap-2 rounded-2xl bg-surface-alt p-2.5">
              <AlarmIcon className="shrink-0 text-accent" />
              <button onClick={() => onOpenMemo(e.memoId)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-bold text-text">{e.title}</p>
                <p className="text-xs text-muted">{fmtDateTime(e.datetime)}</p>
              </button>
              <button
                onClick={() => onCancel(e.memoId, e.index)}
                aria-label={`${e.title} 알람 취소`}
                className="hover-pop flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text"
              >
                <CloseIcon width={14} height={14} />
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </SlideOver>
  );
}
