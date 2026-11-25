import { useTheme } from '../theme/ThemeProvider';
import { PixelRibbon } from './deco';

/** The folded state: a thin bookmark stuck to the left screen edge. */
export function BookmarkTab({ todayCount, onOpen }: { todayCount: number; onOpen: () => void }) {
  const { theme } = useTheme();
  return (
    <button
      onClick={onOpen}
      aria-label={`메모지 펼치기, 오늘 일정 ${todayCount}개`}
      title="메모지 펼치기"
      className="group relative flex h-[184px] w-10 flex-col items-center rounded-r-[20px] pt-3 pb-2 shadow-lg transition-[width] duration-150 hover:w-[42px]"
      style={{ background: 'var(--hero-fill)' }}
    >
      {/* bead edge on the right */}
      <span
        aria-hidden
        className="absolute inset-y-1 right-0 w-[7px] rounded-r-full"
        style={{ background: theme.borderWidth > 1 ? 'var(--border)' : 'var(--line)', backgroundSize: '7px 7px' }}
      />
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-sm font-bold text-text tabular-nums">
        {todayCount}
      </span>
      <span className="mt-2 text-[13px] font-bold text-[var(--title-color)] [writing-mode:vertical-rl]" style={{ textShadow: 'var(--title-shadow)' }}>
        오늘 일정
      </span>
      <span className="mt-auto">{theme.deco.pixelRibbon ? <PixelRibbon /> : <span className="block h-1.5 w-4 rounded-full bg-ink" />}</span>
    </button>
  );
}
