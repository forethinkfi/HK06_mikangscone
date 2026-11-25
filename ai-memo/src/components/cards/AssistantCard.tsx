import { useState } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { Card, IconButton, Progress } from '../ui';
import { Avatar, PearlCurve, Ribbon, Twinkles } from '../deco';
import { BellIcon, GearIcon, SendIcon } from '../icons';

export function AssistantCard({
  briefing,
  todoDone,
  todoTotal,
  alarmCount,
  onSend,
  onBell,
  onSettings,
}: {
  briefing: string;
  todoDone: number;
  todoTotal: number;
  alarmCount: number;
  onSend: (text: string) => void;
  onBell: () => void;
  onSettings: () => void;
}) {
  const { theme, isPro, custom } = useTheme();
  const [text, setText] = useState('');
  const pct = todoTotal ? Math.round((todoDone / todoTotal) * 100) : 0;
  const send = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="relative">
      {/* pearl string draped under the card, hanging into the gap */}
      {theme.deco.pearlCurve && (
        <PearlCurve className="pointer-events-none absolute top-[calc(100%_-_10px)] left-[7%] z-20 w-[48%] drop-shadow-sm" count={20} />
      )}
      {theme.deco.ribbon && <Ribbon className="pointer-events-none absolute -top-7 -right-3 z-20 w-[118px] drop-shadow-md" />}
      <Card hero bodyClass="p-4 pt-5">
        {theme.deco.sparkles && (
          <Twinkles
            spots={[
              { top: '38%', left: '86%', size: 16, delay: 0 },
              { top: '12%', left: '62%', size: 11, delay: 0.9 },
              { top: '56%', left: '6%', size: 12, delay: 1.6 },
            ]}
          />
        )}

        {/* header: avatar, name, round buttons */}
        <div className="relative flex items-start gap-3">
          <Avatar kind={theme.assistant.avatar} image={(isPro && custom.avatarImage) || theme.assistant.image} />
          <div className="min-w-0 flex-1 pt-1">
            <p className="display-title text-[30px]">{theme.assistant.name}</p>
            <p className="mt-1 inline-block rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-text">AI 비서</p>
          </div>
          <div className="mr-16 flex gap-1.5 pt-1">
            <div className="relative">
              <IconButton label={`알림 ${alarmCount}개`} onClick={onBell} size={38}>
                <BellIcon />
              </IconButton>
              {alarmCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold text-on-ink">
                  {alarmCount}
                </span>
              )}
            </div>
            <IconButton label="설정" onClick={onSettings} size={38}>
              <GearIcon />
            </IconButton>
          </div>
        </div>

        {/* briefing + progress on a solid surface so it stays readable over the quilt */}
        <div className="relative mt-4 rounded-[20px] bg-surface p-3.5">
          <p className="text-[11px] font-bold tracking-wide text-muted">오늘 브리핑</p>
          <p className="mt-0.5 text-[15px] leading-snug font-semibold text-text">{briefing}</p>
          <div className="mt-3 flex items-center gap-2.5">
            <Progress value={pct} label="오늘 할 일 진행률" />
            <span className="shrink-0 text-xs font-bold text-text tabular-nums">
              {todoDone}/{todoTotal}
            </span>
          </div>
        </div>

        {/* quick input */}
        <form
          className="relative mt-3 flex items-center gap-2 rounded-full bg-surface p-1.5 pl-4"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor="quick-memo" className="sr-only">
            빠른 메모
          </label>
          <input
            id="quick-memo"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="메모를 입력하세요"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-muted"
          />
          <IconButton label="메모 저장" tone="ink" type="submit" size={38} disabled={!text.trim()}>
            <SendIcon />
          </IconButton>
        </form>
      </Card>
    </div>
  );
}
