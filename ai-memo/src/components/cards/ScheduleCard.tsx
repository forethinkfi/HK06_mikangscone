import { useState } from 'react';
import { Card } from '../ui';
import { fmtTime, sameDay, type ScheduledEvent } from '../../data/hooks';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function ScheduleCard({ events, onOpenMemo }: { events: ScheduledEvent[]; onOpenMemo: (id: number) => void }) {
  const today = new Date();
  // this week, Monday first
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const [picked, setPicked] = useState(() => (today.getDay() + 6) % 7);
  const day = week[picked];
  const list = events.filter((e) => sameDay(e.datetime, day));
  const isToday = sameDay(day.toISOString(), today) && day.getDate() === today.getDate();

  return (
    <Card>
      <div className="flex items-end justify-between">
        <h2 className="display-title text-[34px]">Upcoming</h2>
        <p className="pb-1 text-sm font-semibold text-muted">
          {isToday ? '오늘' : `${day.getMonth() + 1}월 ${day.getDate()}일`} 일정 <span className="text-text">{list.length}개</span>
        </p>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1.5" role="tablist" aria-label="이번 주">
        {week.map((d, i) => {
          const on = i === picked;
          const isT = sameDay(d.toISOString(), today) && d.getDate() === today.getDate();
          const has = events.some((e) => sameDay(e.datetime, d));
          return (
            <button
              key={i}
              role="tab"
              aria-selected={on}
              onClick={() => setPicked(i)}
              className={`hover-pop relative flex h-[58px] flex-col items-center justify-center rounded-full text-xs font-semibold ${
                on ? 'bg-accent text-on-accent shadow-md' : isT ? 'bg-accent-soft text-text' : 'bg-surface-alt text-text'
              }`}
            >
              <span className={on ? '' : 'text-muted'}>{DAYS[d.getDay()]}</span>
              <span className="text-[15px] font-bold">{d.getDate()}</span>
              {has && <span className={`absolute bottom-1.5 h-1 w-1 rounded-full ${on ? 'bg-on-accent' : 'bg-accent'}`} />}
            </button>
          );
        })}
      </div>

      <ol className="mt-4 space-y-0">
        {list.length === 0 && <li className="py-2 text-sm text-muted">이날은 등록된 일정이 없어요.</li>}
        {list.map((e, i) => (
          <li key={`${e.memoId}-${e.index}`} className="relative flex gap-3 pb-3 last:pb-0">
            {/* dot timeline */}
            <div className="flex w-3 flex-col items-center">
              <span className="mt-1.5 h-3 w-3 rounded-full border-[3px] border-accent bg-surface" />
              {i < list.length - 1 && <span className="mt-1 w-0.5 flex-1 rounded bg-line" />}
            </div>
            <button onClick={() => onOpenMemo(e.memoId)} className="flex flex-1 items-baseline justify-between text-left">
              <span className="text-[15px] font-semibold text-text">{e.title}</span>
              <span className="text-sm font-semibold text-muted tabular-nums">{fmtTime(e.datetime)}</span>
            </button>
          </li>
        ))}
      </ol>
    </Card>
  );
}
