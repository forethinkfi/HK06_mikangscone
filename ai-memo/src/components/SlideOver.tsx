import { useEffect, useRef, type ReactNode } from 'react';
import { IconButton } from './ui';
import { BackIcon } from './icons';

/** Full-panel sheet that slides in from the right over the dashboard. */
export function SlideOver({
  title,
  onClose,
  actions,
  children,
}: {
  title: string;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        closeRef.current();
      }
    };
    // capture so Esc closes the sheet before it folds the whole panel
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-label={title}
      className="panel-bg slide-in absolute inset-0 z-40 flex flex-col outline-none"
    >
      {/* the header floats too, so it sits on its own pill instead of the desktop */}
      <header data-solid className="mx-3 mt-3 mb-2 flex shrink-0 items-center gap-2 rounded-full bg-surface p-1.5 pr-2 shadow-lg">
        <IconButton label="뒤로" onClick={onClose} tone="ink" size={36}>
          <BackIcon />
        </IconButton>
        <h2 className="min-w-0 flex-1 truncate font-display text-[20px] text-text">{title}</h2>
        {actions}
      </header>
      <div className="scroll-y flex-1 space-y-3.5 px-3 pb-6">{children}</div>
    </div>
  );
}
