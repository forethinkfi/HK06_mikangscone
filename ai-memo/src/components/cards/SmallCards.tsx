import { Card } from '../ui';
import { MicIcon, SparkIcon, StopIcon } from '../icons';
import { fmtDuration } from '../../data/hooks';

const WEEKDAY = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

export function DateCard() {
  const d = new Date();
  return (
    <Card bodyClass="p-4 flex items-center gap-3">
      <div className="flex h-[74px] w-[52px] flex-col items-center justify-center rounded-full bg-accent text-on-accent">
        <span className="text-[11px] font-bold">{d.getMonth() + 1}월</span>
        <span className="font-display text-[28px] leading-none">{d.getDate()}</span>
      </div>
      <div>
        <p className="display-title text-[22px]">{WEEKDAY[d.getDay()]}</p>
        <p className="mt-1 text-xs font-semibold text-muted">{d.getFullYear()}년</p>
      </div>
    </Card>
  );
}

export function RecordCard({
  recording,
  elapsed,
  totalSeconds,
  stage,
  onToggle,
}: {
  recording: boolean;
  elapsed: number;
  totalSeconds: number;
  stage: 'idle' | 'recording' | 'transcribing';
  onToggle: () => void;
}) {
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return (
    <Card bodyClass="p-4 flex items-center gap-3">
      <button
        onClick={onToggle}
        disabled={stage === 'transcribing'}
        aria-label={recording ? '녹음 멈추기' : '녹음 시작'}
        className={`hover-pop relative flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full ${
          recording ? 'bg-ink text-on-ink' : 'bg-accent text-on-accent'
        }`}
      >
        {recording && <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-30" />}
        {recording ? <StopIcon /> : <MicIcon width={22} height={22} />}
      </button>
      <div className="min-w-0">
        <p className="text-sm font-bold text-text tabular-nums">
          {stage === 'transcribing' ? '받아쓰는 중…' : recording ? `녹음 중 ${mm}:${ss}` : '녹음'}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-muted">누적 {fmtDuration(totalSeconds)}</p>
      </div>
    </Card>
  );
}

export function AiCard({
  selectedCount,
  busy,
  onRun,
}: {
  selectedCount: number;
  busy: boolean;
  onRun: () => void;
}) {
  const disabled = selectedCount === 0 || busy;
  return (
    <Card hero className="h-full" bodyClass="p-4 flex flex-col">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-accent">
        <SparkIcon width={22} height={22} />
      </div>
      <p className="display-title mt-3 text-[26px]">AI 정리</p>
      <p className="mt-2 rounded-2xl bg-surface px-3 py-2 text-xs leading-snug font-semibold text-text">
        {busy ? '정리하고 있어요…' : selectedCount ? `메모 ${selectedCount}개를 요약·할 일·일정으로 정리해요` : '메모 목록에서 정리할 메모를 골라 주세요'}
      </p>
      <button
        onClick={onRun}
        disabled={disabled}
        className="hover-pop mt-auto h-10 rounded-full bg-ink text-sm font-bold text-on-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? '정리 중…' : '정리하기'}
      </button>
    </Card>
  );
}
