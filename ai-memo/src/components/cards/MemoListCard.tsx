import { Card, PillButton } from '../ui';
import { CheckIcon, PlusIcon } from '../icons';
import { organizedPercent, type Memo } from '../../types';
import { useTheme } from '../../theme/ThemeProvider';

export function MemoListCard({
  memos,
  selected,
  onToggleSelect,
  onOpen,
  onNew,
}: {
  memos: Memo[];
  selected: Set<number>;
  onToggleSelect: (id: number) => void;
  onOpen: (id: number) => void;
  onNew: () => void;
}) {
  const { theme } = useTheme();
  // free users pick from the theme's palette, Pro users any colour – both end up in m.color
  const colorOf = (m: Memo, i: number) => m.color || theme.memoColors[i % theme.memoColors.length];

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="display-title text-[30px]">Memos</h2>
        <PillButton onClick={onNew}>
          <PlusIcon width={16} height={16} /> 메모
        </PillButton>
      </div>
      <p className="mt-1 text-xs text-muted">동그라미를 눌러 AI 정리할 메모를 고르세요.</p>

      <ul className="mt-3 space-y-2">
        {memos.length === 0 && <li className="rounded-full bg-surface-alt px-4 py-3 text-sm text-muted">아직 메모가 없어요.</li>}
        {memos.map((m, i) => {
          const pct = organizedPercent(m);
          const on = selected.has(m.id!);
          const color = colorOf(m, i);
          return (
            <li
              key={m.id}
              className={`relative flex h-12 items-center gap-2 overflow-hidden rounded-full bg-surface-alt pr-3 pl-1.5 ${
                on ? 'ring-2 ring-accent' : ''
              }`}
            >
              {/* progress wash behind the bar, like a roadmap track */}
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-full opacity-25"
                style={{ width: `${Math.max(pct, 8)}%`, background: color }}
              />
              <button
                onClick={() => onToggleSelect(m.id!)}
                aria-pressed={on}
                aria-label={`${m.title} ${on ? '선택 해제' : 'AI 정리할 메모로 선택'}`}
                className="hover-pop relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px]"
                style={{ borderColor: color, background: on ? color : 'var(--surface)' }}
              >
                {on && <CheckIcon width={16} height={16} color="#fff" strokeWidth={3} />}
              </button>
              <button onClick={() => onOpen(m.id!)} className="relative z-10 flex min-w-0 flex-1 items-center gap-2 text-left">
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-text">
                  {m.kind === 'meeting' && <span aria-label="회의록">🎙 </span>}
                  {m.title}
                </span>
                {m.tags.slice(0, 1).map((t) => (
                  <span key={t} className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-text">
                    #{t}
                  </span>
                ))}
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                    pct === 100 ? 'bg-accent text-on-accent' : 'bg-surface text-text'
                  }`}
                  title="정리 상태"
                >
                  {pct}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
