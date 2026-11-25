import { db } from '../db';
import type { Memo } from '../types';

let once: Promise<void> | null = null;

/** Sample memos so the dashboard has something to show on the very first run. */
export function seedIfEmpty() {
  // React StrictMode runs effects twice in dev – share one run
  once ??= seed();
  return once;
}

async function seed() {
  const seeded = await db.settings.get('seeded');
  if (seeded) return;
  const now = new Date();
  const at = (dayOffset: number, h: number, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return toLocalIso(d);
  };
  const t = Date.now();
  const memos: Memo[] = [
    {
      title: '주간 마케팅 회의',
      body: '신규 캠페인 시안 금요일까지. 내일 3시에 디자인팀이랑 리뷰 미팅. 예산표 민지님께 공유.',
      tags: ['회의', '마케팅'],
      kind: 'memo',
      createdAt: t - 3600e3 * 5,
      updatedAt: t - 3600e3 * 5,
      ai: {
        summary: '신규 캠페인 시안을 금요일까지 마무리하고, 내일 디자인팀과 리뷰한다.',
        tags: ['회의', '마케팅'],
        todos: [
          { text: '캠페인 시안 마무리', done: true },
          { text: '예산표 민지님께 공유', done: false },
        ],
        events: [
          { title: '디자인팀 리뷰 미팅', datetime: at(1, 15), registered: true },
          { title: '캠페인 시안 마감', datetime: at(3, 18), registered: false },
        ],
        organizedAt: t - 3600e3 * 4,
      },
    },
    {
      title: '점심 약속 · 성수',
      body: '오늘 12시 반 성수역 3번 출구',
      tags: ['약속'],
      kind: 'memo',
      createdAt: t - 3600e3 * 3,
      updatedAt: t - 3600e3 * 3,
      ai: {
        summary: '오늘 12시 30분 성수역 3번 출구에서 점심 약속.',
        tags: ['약속'],
        todos: [],
        events: [{ title: '성수 점심', datetime: at(0, 12, 30), registered: true }],
        organizedAt: t - 3600e3 * 3,
      },
    },
    {
      title: '읽을 거리',
      body: '디자인 시스템 아티클, 팀 OKR 문서 다시 보기',
      tags: ['자료'],
      kind: 'memo',
      createdAt: t - 3600e3 * 2,
      updatedAt: t - 3600e3 * 2,
    },
    {
      title: '분기 보고서 초안',
      body: '3분기 지표 정리, 그래프 3개. 목요일 오후 4시 팀장님 보고.',
      tags: ['보고'],
      kind: 'memo',
      createdAt: t - 3600e3,
      updatedAt: t - 3600e3,
      ai: {
        summary: '3분기 지표와 그래프 3개로 보고서 초안을 만든다.',
        tags: ['보고'],
        todos: [
          { text: '3분기 지표 정리', done: false },
          { text: '그래프 3개 만들기', done: false },
        ],
        events: [{ title: '팀장님 보고', datetime: at(2, 16), registered: true }],
        organizedAt: t - 3600e3,
      },
    },
  ];
  await db.transaction('rw', db.memos, db.settings, db.recordings, async () => {
    await db.memos.bulkAdd(memos);
    await db.recordings.add({ seconds: 1520, createdAt: t - 86400e3 });
    await db.settings.put({ key: 'seeded', value: true });
  });
}

export function toLocalIso(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
