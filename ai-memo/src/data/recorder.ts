import { useEffect, useRef, useState } from 'react';
import { db } from '../db';

export type RecStage = 'idle' | 'recording' | 'transcribing';

/**
 * 음성→텍스트 자리. 지금은 미리보기용 예시 받아쓰기를 돌려준다.
 * 실제 STT(예: Whisper)를 붙일 때는 이 함수만 바꾸면 된다 — 키는 Electron main에서만 쓴다.
 */
async function transcribe(_audio: Blob | null, seconds: number): Promise<{ text: string; preview: boolean }> {
  await new Promise((r) => setTimeout(r, 900));
  const mins = Math.max(1, Math.round(seconds / 60));
  return {
    preview: true,
    text: [
      `(약 ${mins}분 녹음)`,
      '김팀장: 다음 달 신규 캠페인 일정부터 정리할게요. 시안은 이번 주 금요일까지 받는 걸로 하죠.',
      '박민지: 네, 디자인팀이랑 내일 오후 2시에 중간 리뷰 잡아 둘게요.',
      '이준호: 예산은 지난 분기랑 같게 가고, 광고 채널은 인스타 위주로 가는 게 좋겠어요.',
      '김팀장: 좋아요, 인스타 위주로 결정. 준호님은 채널별 예상 비용표 다음 주 월요일까지 공유 부탁해요.',
      '박민지: 런칭 행사 장소 후보도 세 군데 알아볼게요.',
    ].join('\n'),
  };
}

export function useRecorder({ onMeeting, onError }: { onMeeting: (memoId: number) => void; onError: (msg: string) => void }) {
  const [stage, setStage] = useState<RecStage>('idle');
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const media = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (stage !== 'recording') return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [stage]);

  // release the mic if the component goes away mid-recording
  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  const start = async () => {
    const ok = confirm(
      '회의 녹음은 참석자 동의가 필요할 수 있어요.\n녹음이 길수록 받아쓰기 비용이 커져요 (시간은 카드에 표시돼요).\n\n녹음을 시작할까요?',
    );
    if (!ok) return;
    chunks.current = [];
    try {
      // some setups never answer the mic request – don't leave the button hanging
      stream.current = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('mic timeout')), 4000)),
      ]);
      const rec = new MediaRecorder(stream.current);
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.start(1000);
      media.current = rec;
    } catch {
      // no mic / permission denied: still run the preview flow with the timer only
      media.current = null;
      onError('마이크를 쓸 수 없어 시간만 재는 미리보기로 녹음해요.');
    }
    startedAt.current = Date.now();
    setElapsed(0);
    setStage('recording');
  };

  const stop = async () => {
    const seconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    setStage('transcribing');
    const audio = await new Promise<Blob | null>((resolve) => {
      const rec = media.current;
      if (!rec || rec.state === 'inactive') return resolve(null);
      rec.onstop = () => resolve(new Blob(chunks.current, { type: rec.mimeType }));
      rec.stop();
    });
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;

    try {
      const now = Date.now();
      await db.recordings.add({ seconds, createdAt: now });
      const { text, preview } = await transcribe(audio, seconds);
      const d = new Date(now);
      const id = (await db.memos.add({
        title: `회의 녹음 ${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}`,
        body: '',
        tags: ['회의'],
        kind: 'meeting',
        transcript: text,
        transcriptPreview: preview,
        audioSeconds: seconds,
        createdAt: now,
        updatedAt: now,
      })) as number;
      setStage('idle');
      onMeeting(id);
    } catch (e) {
      setStage('idle');
      onError(`녹음을 저장하지 못했어요: ${String(e)}`);
    }
  };

  return {
    stage,
    recording: stage === 'recording',
    elapsed,
    toggle: () => (stage === 'idle' ? start() : stage === 'recording' ? stop() : undefined),
  };
}
