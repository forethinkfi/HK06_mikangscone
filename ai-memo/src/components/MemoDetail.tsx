import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { Card, Chip, PillButton } from './ui';
import { AlarmIcon, CheckIcon, CloseIcon, ImageIcon, PlusIcon, SparkIcon, TrashIcon } from './icons';
import { addImage, deleteMemo, fmtDateTime, removeImage, updateMemo, useImages, useMemo_ } from '../data/hooks';
import { useTheme } from '../theme/ThemeProvider';
import { useSetting } from '../data/settings';
import type { Memo, MemoImage } from '../types';
import { desktop } from '../desktop';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

/** A note's title is just its first line (meetings keep the title AI gave them). */
function autoTitle(text: string) {
  const first = text.trim().split('\n')[0].trim();
  if (!first) return '새 메모';
  return first.length > 28 ? first.slice(0, 28) + '…' : first;
}

/**
 * The memo screen. By default it is only a sticky note: write, format, attach images.
 * "전체보기" (⋯ menu) adds the AI 정리 result, transcript and alarm buttons below the note.
 */
export function MemoDetail({
  id,
  mode = 'panel',
  onClose,
  onNew,
  onOrganize,
  organizing,
  onRegister,
}: {
  id: number;
  /** 'window': the note is its own desktop window (drag by the top bar, resize from the corner) */
  mode?: 'panel' | 'window';
  /** `deleted` is true when the note was empty and got thrown away */
  onClose: (deleted: boolean) => void;
  onNew: () => void;
  onOrganize: (id: number) => void;
  organizing: boolean;
  onRegister: (memoId: number, index: number, on: boolean) => void;
}) {
  const inWindow = mode === 'window';
  const memo = useMemo_(id);
  const images = useImages(id);
  const { theme, isPro } = useTheme();
  const [heart] = useSetting('heartFrame', false);
  const [full, setFull] = useState<boolean | null>(null);
  const [menu, setMenu] = useState(false);
  const [empty, setEmpty] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState('');
  const editor = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const latest = useRef({ memo, images });
  latest.current = { memo, images };

  // fill the editor once per memo; after that the editor itself holds the text
  const loaded = useRef(false);
  useEffect(() => {
    if (!memo || loaded.current || !editor.current) return;
    loaded.current = true;
    editor.current.innerHTML = memo.html ?? escapeHtml(memo.body);
    setEmpty(!editor.current.innerText.trim());
    setFull(memo.kind === 'meeting'); // meetings open with their minutes visible
    if (!memo.body.trim()) editor.current.focus();
  }, [memo]);

  const save = () => {
    const el = editor.current;
    const m = latest.current.memo;
    if (!el || !m) return;
    const text = el.innerText.replace(/\n{3,}/g, '\n\n').trimEnd();
    const patch: Partial<Memo> = { html: el.innerHTML, body: text };
    if (m.kind !== 'meeting') patch.title = autoTitle(text);
    updateMemo(id, patch);
  };
  const onInput = () => {
    setEmpty(!editor.current?.innerText.trim());
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(save, 400);
  };

  // closing: flush the last keystrokes, and throw away a note that was never written in
  const finish = async () => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    const { memo: m, images: imgs } = latest.current;
    const text = editor.current?.innerText.trim() ?? '';
    if (m && !text && imgs.length === 0 && !m.ai && !m.transcript) {
      await deleteMemo(id);
      return true;
    }
    save();
    return false;
  };
  const close = async () => onClose(await finish());
  const newNote = async () => {
    // a note window stays open next to the new one; in the panel the new note replaces it
    if (!inWindow) await finish();
    onNew();
  };
  const closeRef = useRef(close);
  closeRef.current = close;
  const saveRef = useRef(save);
  saveRef.current = save;
  const menuRef = useRef(menu);
  menuRef.current = menu;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      if (menuRef.current) setMenu(false);
      // a note on the desktop stays put; Esc only closes it inside the panel
      else if (!inWindow) closeRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      // e.g. the whole panel was folded while typing: keep what was written
      if (saveTimer.current !== undefined) {
        window.clearTimeout(saveTimer.current);
        saveRef.current();
      }
    };
  }, []);

  if (memo === undefined) return null;

  const color = memo.color || theme.memoColors[0];
  const noteBg = `color-mix(in srgb, ${color} 13%, var(--surface))`;
  const barBg = `color-mix(in srgb, ${color} 42%, var(--surface))`;

  const takeFiles = async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    for (const f of list) {
      if (f.size > MAX_IMAGE_BYTES) {
        setNotice(`${f.name || '이미지'}는 10MB보다 커서 넣지 않았어요.`);
        continue;
      }
      await addImage(id, f);
    }
  };

  const onPaste = async (e: ClipboardEvent) => {
    const files = [...e.clipboardData.files];
    e.preventDefault();
    if (files.some((f) => f.type.startsWith('image/'))) return takeFiles(files);
    // paste words only – no fonts or colours from web pages
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  };
  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    await takeFiles(e.dataTransfer.files);
  };

  const format = (cmd: string) => {
    editor.current?.focus();
    document.execCommand(cmd);
    onInput();
  };

  const tools: { cmd: string; label: string; icon: React.ReactNode }[] = [
    { cmd: 'bold', label: '굵게', icon: <b className="font-sans text-[15px]">B</b> },
    { cmd: 'italic', label: '기울임', icon: <i className="font-serif text-[15px]">I</i> },
    { cmd: 'underline', label: '밑줄', icon: <u className="font-sans text-[15px]">U</u> },
    { cmd: 'strikeThrough', label: '취소선', icon: <s className="font-sans text-[15px]">ab</s> },
    {
      cmd: 'insertUnorderedList',
      label: '목록',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M9 6h11M9 12h11M9 18h11" />
          <circle cx="4.5" cy="6" r="1" fill="currentColor" />
          <circle cx="4.5" cy="12" r="1" fill="currentColor" />
          <circle cx="4.5" cy="18" r="1" fill="currentColor" />
        </svg>
      ),
    },
  ];

  const barBtn =
    'no-drag flex h-8 w-8 items-center justify-center rounded-lg text-text/75 transition-colors hover:bg-black/8 hover:text-text';
  // in a note window, 전체보기 scrolls inside the note itself
  const inlineFull = inWindow && !!full;

  const aiBlocks = (
    <>
      {memo.transcript && <TranscriptCard memo={memo} />}
      <AiSection memo={memo} organizing={organizing} onOrganize={() => (save(), onOrganize(id))} onRegister={onRegister} />
    </>
  );

  return (
    <div
      role="dialog"
      aria-label="메모"
      className={inWindow ? 'flex h-full flex-col p-2.5 pb-4' : 'slide-in absolute inset-0 z-40 flex flex-col'}
    >
      <div className={inWindow ? 'flex min-h-0 flex-1 flex-col' : 'scroll-y flex-1 space-y-3 px-3 pt-3 pb-6'}>
        {/* ── the sticky note ── */}
        <section
          data-solid
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`relative flex flex-col overflow-visible rounded-[14px] ${
            inWindow
              ? 'h-full shadow-[0_6px_14px_-4px_rgba(30,10,20,.40),0_1px_4px_rgba(30,10,20,.18)]'
              : `shadow-[0_18px_36px_-12px_rgba(30,10,20,.45),0_3px_8px_rgba(30,10,20,.18)] ${full ? 'h-[380px]' : 'h-[min(560px,calc(100vh-24px))]'}`
          } ${dragging ? 'outline-3 outline-accent outline-dashed' : ''}`}
          style={{ background: noteBg }}
        >
          {/* top bar – in a note window, grab it to move the note anywhere */}
          <div
            className={`flex h-9 shrink-0 items-center rounded-t-[14px] px-1 ${inWindow ? 'drag-region' : ''}`}
            style={{ background: barBg }}
          >
            <button className={barBtn} onClick={newNote} aria-label="새 메모" title="새 메모">
              <PlusIcon width={17} height={17} />
            </button>
            <span className="min-w-0 flex-1 truncate px-1 text-center text-xs text-text/60">
              {memo.kind === 'meeting' ? memo.title : ''}
            </span>
            <button className={barBtn} onClick={() => setMenu((m) => !m)} aria-label="메뉴" aria-expanded={menu} title="메뉴">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="5" cy="12" r="1.7" />
                <circle cx="12" cy="12" r="1.7" />
                <circle cx="19" cy="12" r="1.7" />
              </svg>
            </button>
            <button className={barBtn} onClick={close} aria-label="닫기" title="닫기 (Esc)">
              <CloseIcon width={17} height={17} />
            </button>
          </div>

          {menu && (
            <NoteMenu
              full={!!full}
              color={memo.color}
              colors={theme.memoColors}
              isPro={isPro}
              onFull={() => {
                if (!full && inWindow) desktop?.ensureNoteTall();
                setFull((f) => !f);
                setMenu(false);
              }}
              onColor={(c) => updateMemo(id, { color: c })}
              onDelete={async () => {
                setMenu(false);
                if (confirm('이 메모를 삭제할까요? 되돌릴 수 없어요.')) {
                  window.clearTimeout(saveTimer.current);
                  saveTimer.current = undefined;
                  await deleteMemo(id);
                  onClose(true);
                }
              }}
              onDismiss={() => setMenu(false)}
            />
          )}

          {/* writing area (the editor keeps its place in the tree so its text survives 전체보기) */}
          <div className={`min-h-0 flex-1 ${inlineFull ? 'scroll-y' : 'flex flex-col'}`}>
            <div className={`relative ${inlineFull ? '' : 'min-h-0 flex-1'}`}>
              {empty && (
                <span aria-hidden className="pointer-events-none absolute top-3.5 left-4 text-[17px] text-text/45">
                  메모를 작성하세요...
                </span>
              )}
              <div
                ref={editor}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline
                aria-label="메모 내용"
                onInput={onInput}
                onPaste={onPaste}
                onBlur={save}
                className={`note-editor px-4 py-3 text-[17px] leading-relaxed text-text outline-none select-text ${
                  inlineFull ? 'min-h-[150px]' : 'scroll-y h-full'
                }`}
              />
            </div>
            {inlineFull && <div className="space-y-3 px-2 pb-3">{aiBlocks}</div>}
          </div>

          {/* attached images */}
          {images.length > 0 && (
            <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-2">
              {images.map((img) => (
                <Thumb key={img.id} img={img} heart={heart} />
              ))}
            </div>
          )}
          {notice && <p className="shrink-0 px-4 pb-1 text-xs text-accent">{notice}</p>}

          {/* bottom toolbar */}
          <div className="flex h-11 shrink-0 items-center gap-1 border-t border-black/6 px-2">
            {tools.map((t) => (
              <button
                key={t.cmd}
                className={barBtn}
                onMouseDown={(e) => e.preventDefault() /* keep the text selection */}
                onClick={() => format(t.cmd)}
                aria-label={t.label}
                title={t.label}
              >
                {t.icon}
              </button>
            ))}
            <button className={barBtn} onClick={() => fileInput.current?.click()} aria-label="이미지 넣기" title="이미지 넣기 (붙여넣기·끌어다 놓기도 돼요)">
              <ImageIcon width={17} height={17} />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) takeFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {inWindow && <ResizeGrip />}
        </section>

        {/* ── 전체보기 in the panel: transcript + AI 정리 under the note ── */}
        {full && !inWindow && aiBlocks}
      </div>
    </div>
  );
}

/** Bottom-right corner handle: a transparent window can't use the OS edge, so resize by hand. */
function ResizeGrip() {
  const start = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const frame = useRef(0);
  return (
    <div
      aria-hidden
      title="크기 조절"
      className="no-drag absolute right-0.5 bottom-0.5 h-4 w-4 cursor-nwse-resize text-text/35"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.screenX, y: e.screenY, w: window.outerWidth, h: window.outerHeight };
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        const { screenX, screenY } = e;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => desktop?.resizeNote(s.w + screenX - s.x, s.h + screenY - s.y));
      }}
      onPointerUp={() => (start.current = null)}
      onPointerCancel={() => (start.current = null)}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M14 6L6 14M14 10.5L10.5 14" />
      </svg>
    </div>
  );
}

function NoteMenu({
  full,
  color,
  colors,
  isPro,
  onFull,
  onColor,
  onDelete,
  onDismiss,
}: {
  full: boolean;
  color?: string;
  colors: string[];
  isPro: boolean;
  onFull: () => void;
  onColor: (c: string) => void;
  onDelete: () => void;
  onDismiss: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onDismiss} aria-hidden />
      <div role="menu" className="absolute top-9 right-2 z-20 w-56 rounded-xl bg-surface p-1.5 text-sm text-text shadow-xl ring-1 ring-black/5">
        <button role="menuitem" onClick={onFull} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-surface-alt">
          <SparkIcon width={16} height={16} className="text-accent" />
          {full ? '간단히 보기' : '전체보기 (AI 정리)'}
        </button>
        <div className="flex items-center gap-1.5 px-3 py-2">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => onColor(c)}
              aria-label={`메모 색 ${c}`}
              aria-pressed={color === c}
              className="h-6 w-6 rounded-full border-2 border-surface shadow"
              style={{ background: c, outline: color === c ? '2px solid var(--text)' : undefined }}
            />
          ))}
          {isPro && (
            <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-line" title="직접 고르기">
              <span className="sr-only">메모 색 직접 고르기</span>
              <input type="color" value={color ?? '#ff5fa2'} onChange={(e) => onColor(e.target.value)} className="absolute inset-0 opacity-0" />
            </label>
          )}
        </div>
        <button role="menuitem" onClick={onDelete} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-surface-alt">
          <TrashIcon width={16} height={16} /> 메모 삭제
        </button>
      </div>
    </>
  );
}

function TranscriptCard({ memo }: { memo: Memo }) {
  return (
    <Card bodyClass="p-4">
      <details>
        <summary className="cursor-pointer text-sm font-bold text-text">
          받아쓰기 원문
          {memo.transcriptPreview && (
            <span className="ml-2 rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-bold text-text">미리보기 예시</span>
          )}
        </summary>
        {memo.transcriptPreview && <p className="mt-2 text-xs text-muted">음성 인식은 아직 연결 전이라 예시 문장이 들어가 있어요.</p>}
        <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-text select-text">{memo.transcript}</p>
      </details>
    </Card>
  );
}

function AiSection({
  memo,
  organizing,
  onOrganize,
  onRegister,
}: {
  memo: Memo;
  organizing: boolean;
  onOrganize: () => void;
  onRegister: (memoId: number, index: number, on: boolean) => void;
}) {
  const id = memo.id!;
  const ai = memo.ai;
  const toggleTodo = (i: number) => {
    if (!ai) return;
    const todos = ai.todos.map((t, j) => (j === i ? { ...t, done: !t.done } : t));
    updateMemo(id, { ai: { ...ai, todos } });
  };

  return (
    <Card hero bodyClass="p-4">
      <div className="flex items-center justify-between">
        <p className="display-title text-[24px]">AI 정리</p>
        <PillButton onClick={onOrganize} disabled={organizing || !(memo.body.trim() || memo.transcript)}>
          <SparkIcon width={15} height={15} /> {organizing ? '정리 중…' : ai ? '다시 정리' : '정리하기'}
        </PillButton>
      </div>

      {!ai ? (
        <p className="mt-3 rounded-2xl bg-surface p-3 text-sm text-text">아직 정리하지 않았어요. 버튼을 누르면 요약·할 일·일정을 뽑아 드려요.</p>
      ) : (
        <div className="mt-3 space-y-2.5">
          <section className="rounded-2xl bg-surface p-3">
            <h4 className="text-xs font-bold text-muted">요약</h4>
            <p className="mt-1 text-[15px] leading-relaxed text-text select-text">{ai.summary}</p>
            {ai.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ai.tags.map((t) => (
                  <Chip key={t}>#{t}</Chip>
                ))}
              </div>
            )}
          </section>

          {ai.decisions && ai.decisions.length > 0 && (
            <section className="rounded-2xl bg-surface p-3">
              <h4 className="text-xs font-bold text-muted">결정사항</h4>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-text">
                {ai.decisions.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl bg-surface p-3">
            <h4 className="text-xs font-bold text-muted">할 일 {ai.todos.length}개</h4>
            {ai.todos.length === 0 && <p className="mt-1 text-sm text-muted">찾은 할 일이 없어요.</p>}
            <ul className="mt-1 space-y-1">
              {ai.todos.map((t, i) => (
                <li key={i}>
                  <button onClick={() => toggleTodo(i)} className="flex w-full items-center gap-2 py-1 text-left">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        t.done ? 'border-accent bg-accent text-on-accent' : 'border-line'
                      }`}
                    >
                      {t.done && <CheckIcon width={12} height={12} strokeWidth={3.5} />}
                    </span>
                    <span className={`text-sm ${t.done ? 'text-muted line-through' : 'text-text'}`}>{t.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-surface p-3">
            <h4 className="text-xs font-bold text-muted">찾은 일정 {ai.events.length}개</h4>
            {ai.events.length === 0 && <p className="mt-1 text-sm text-muted">찾은 일정이 없어요.</p>}
            <ul className="mt-1.5 space-y-2">
              {ai.events.map((ev, i) => {
                const past = new Date(ev.datetime).getTime() < Date.now();
                return (
                  <li key={i} className="flex items-center gap-2 rounded-2xl bg-surface-alt p-2.5">
                    <AlarmIcon width={18} height={18} className="shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-text">{ev.title}</p>
                      <p className="text-xs text-muted">{fmtDateTime(ev.datetime)}</p>
                    </div>
                    {ev.registered ? (
                      <button
                        onClick={() => onRegister(id, i, false)}
                        className="hover-pop inline-flex h-8 items-center gap-1 rounded-full bg-accent px-3 text-xs font-bold text-on-accent"
                        title="눌러서 알람 취소"
                      >
                        <CheckIcon width={13} height={13} strokeWidth={3} /> 등록됨
                      </button>
                    ) : (
                      <PillButton
                        className="!h-8 !px-3 !text-xs"
                        disabled={past}
                        onClick={() => onRegister(id, i, true)}
                        title={past ? '이미 지난 시간이에요' : undefined}
                      >
                        알람 등록
                      </PillButton>
                    )}
                  </li>
                );
              })}
            </ul>
            {ai.events.length > 0 && <p className="mt-2 text-[11px] text-muted">AI가 잘못 읽었을 수 있어요. 날짜와 시간을 확인하고 등록해 주세요.</p>}
          </section>
        </div>
      )}
    </Card>
  );
}

function Thumb({ img, heart }: { img: MemoImage; heart: boolean }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(img.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [img.blob]);
  return (
    <div className="group relative h-16 w-16 shrink-0">
      <div className={`h-full w-full overflow-hidden ${heart ? 'heart-frame' : 'rounded-lg'}`}>
        {url && <img src={url} alt="첨부 이미지" className="h-full w-full object-cover" />}
      </div>
      <button
        onClick={() => removeImage(img.id!)}
        aria-label="이미지 삭제"
        className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-on-ink opacity-0 shadow group-hover:opacity-100 focus-visible:opacity-100"
      >
        <CloseIcon width={11} height={11} />
      </button>
    </div>
  );
}
