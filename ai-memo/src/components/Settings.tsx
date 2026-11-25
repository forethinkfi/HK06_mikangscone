import { useState, type ReactNode } from 'react';
import { SlideOver } from './SlideOver';
import { Card } from './ui';
import { Avatar } from './deco';
import { CheckIcon, LockIcon } from './icons';
import { useTheme } from '../theme/ThemeProvider';
import { fontChoices, themeList, type FontChoice } from '../theme/themes';
import { useSetting } from '../data/settings';

const MAX_UPLOAD = 3 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function Settings({ onClose, status }: { onClose: () => void; status: ReactNode }) {
  const { theme, setThemeId, isPro, setIsPro, custom, setCustom } = useTheme();
  const [heart, setHeart] = useSetting('heartFrame', false);
  const [err, setErr] = useState('');

  const upload = (key: 'avatarImage' | 'backgroundImage') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX_UPLOAD) return setErr('이미지는 3MB 이하로 올려 주세요.');
    setErr('');
    setCustom({ ...custom, [key]: await readAsDataUrl(f) });
  };

  return (
    <SlideOver title="설정" onClose={onClose}>
      <Card bodyClass="p-4">
        <h3 className="text-sm font-bold text-text">테마</h3>
        <p className="mt-0.5 text-xs text-muted">기본 테마 3개는 무료예요. 메모 색과 비서 모습이 함께 바뀌어요.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {themeList.map((t) => {
            const on = t.id === theme.id;
            return (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                aria-pressed={on}
                className={`hover-pop relative overflow-hidden rounded-[20px] p-1 text-left ${on ? 'ring-[3px] ring-accent' : 'ring-1 ring-line'}`}
              >
                <div className="flex h-16 items-end justify-center rounded-2xl pb-1.5" style={{ background: t.pattern }}>
                  <div className="h-7 w-12 rounded-full" style={{ background: t.heroFill }} />
                </div>
                <p className="mt-1.5 px-1 text-xs font-bold text-text">{t.name}</p>
                <p className="px-1 pb-1 text-[10px] leading-tight text-muted">{t.blurb}</p>
                {on && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-on-accent">
                    <CheckIcon width={12} height={12} strokeWidth={3.5} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <label className="mt-4 flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-bold text-text">하트 프레임</span>
            <span className="block text-xs text-muted">메모 상세의 이미지를 하트 모양으로 보여줘요.</span>
          </span>
          <Toggle on={heart} onChange={setHeart} label="하트 프레임" />
        </label>
      </Card>

      <Card bodyClass="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text">나만의 꾸미기</h3>
          <span className={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-bold ${isPro ? 'bg-accent text-on-accent' : 'bg-ink text-on-ink'}`}>
            {!isPro && <LockIcon width={12} height={12} />} Pro
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {isPro ? '하나하나 직접 바꿀 수 있어요.' : '구독하면 열려요. 결제는 아직 준비 중이에요.'}
        </p>

        <fieldset disabled={!isPro} className={`mt-3 space-y-3 ${isPro ? '' : 'opacity-55'}`}>
          <Row label="비서 캐릭터 이미지">
            <Avatar kind={theme.assistant.avatar} image={(isPro && custom.avatarImage) || theme.assistant.image} size={36} />
            <FileButton accept="image/*" onChange={upload('avatarImage')}>
              올리기
            </FileButton>
            {custom.avatarImage && <ResetButton onClick={() => setCustom({ ...custom, avatarImage: undefined })} />}
          </Row>
          <Row label="배경 이미지">
            <FileButton accept="image/*" onChange={upload('backgroundImage')}>
              바꾸기
            </FileButton>
            {custom.backgroundImage && <ResetButton onClick={() => setCustom({ ...custom, backgroundImage: undefined })} />}
          </Row>
          <Row label="글꼴">
            <select
              value={custom.font}
              onChange={(e) => setCustom({ ...custom, font: e.target.value as FontChoice })}
              className="h-9 rounded-full bg-surface-alt px-3 text-sm font-semibold text-text"
            >
              {fontChoices.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </Row>
          <p className="text-xs text-muted">메모 색은 각 메모 상세 화면에서 직접 고를 수 있어요.</p>
        </fieldset>
        {err && <p className="mt-2 text-xs font-semibold text-accent">{err}</p>}

        <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-surface-alt p-3">
          <span>
            <span className="block text-sm font-bold text-text">Pro 미리보기</span>
            <span className="block text-xs text-muted">개발용 스위치예요 (isPro 플래그).</span>
          </span>
          <Toggle on={isPro} onChange={setIsPro} label="Pro 미리보기" />
        </label>
      </Card>

      <Card bodyClass="p-4">
        <h3 className="text-sm font-bold text-text">AI · 알람</h3>
        <div className="mt-2 space-y-1.5 text-sm text-text">{status}</div>
      </Card>
    </SlideOver>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-sm font-semibold text-text">{label}</span>
      {children}
    </div>
  );
}

function FileButton({ children, ...p }: { children: ReactNode; accept: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="hover-pop inline-flex h-9 cursor-pointer items-center rounded-full bg-ink px-4 text-sm font-semibold text-on-ink has-[:disabled]:cursor-not-allowed">
      {children}
      <input type="file" hidden {...p} />
    </label>
  );
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="h-9 rounded-full bg-surface-alt px-3 text-xs font-bold text-text">
      기본값
    </button>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-line'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-surface shadow transition-[left] ${on ? 'left-6' : 'left-1'}`} />
    </button>
  );
}
