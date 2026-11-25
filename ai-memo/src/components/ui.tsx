import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Card({
  children,
  hero = false,
  className = '',
  bodyClass = 'p-5',
}: {
  children: ReactNode;
  hero?: boolean;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`card ${hero ? 'card-hero' : ''} ${className}`}>
      <div className={`card-body ${bodyClass}`}>{children}</div>
    </section>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** Black pill button ("+ 메모"). */
export function PillButton({ className = '', ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={`hover-pop inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink disabled:opacity-50 ${className}`}
    />
  );
}

/** Round icon button. `tone` picks the fill. */
export function IconButton({
  label,
  tone = 'surface',
  size = 40,
  className = '',
  ...p
}: BtnProps & { label: string; tone?: 'surface' | 'ink' | 'accent'; size?: number }) {
  const tones = {
    surface: 'bg-surface text-text shadow-sm',
    ink: 'bg-ink text-on-ink',
    accent: 'bg-accent text-on-accent',
  };
  return (
    <button
      {...p}
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className={`hover-pop inline-flex shrink-0 items-center justify-center rounded-full disabled:opacity-50 ${tones[tone]} ${className}`}
    />
  );
}

export function Chip({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${
        active ? 'bg-accent text-on-accent' : 'bg-surface-alt text-text'
      }`}
    >
      {children}
    </span>
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-3 w-full overflow-hidden rounded-full bg-surface-alt"
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}
