import fs from 'node:fs';
import path from 'node:path';
import { getLocalSpeciesRoot, loadSpecies } from './speciesLoader';
import type { SpeciesConfig, ChatterConfig } from '../shared/speciesSchema';

export const DEFAULT_CHATTER: ChatterConfig = {
  enabled: true, minIntervalSec: 180, maxIntervalSec: 360, bubbleSec: 7,
  solo: ['힘들면 잠깐 쉬어도 돼. 물 한 모금 어때?', '오늘도 여기까지 해낸 너, 꽤 멋진걸.', '할 일은 많지만 간식 시간은 지켜야지.'],
  dialogues: [['제일 일하기 싫은 날은?', '맨날.'], ['퇴근까지 얼마나 남았어?', '방금 확인했는데 아직도 방금이야.']],
};

export function loadCompanionScene(active: SpeciesConfig): SpeciesConfig {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(getLocalSpeciesRoot(), 'scene.json'), 'utf8'));
    const ids: string[] = Array.isArray(raw.pets) ? raw.pets.filter((id: unknown) => typeof id === 'string').slice(0, 6) : [];
    const companions = [...new Set(ids)].filter((id) => id !== active.id).flatMap((id) => {
      try { return [loadSpecies(id)]; } catch { return []; }
    });
    const settings = raw.chatter ?? {};
    const finite = (v: unknown, fallback: number, min: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(min, v) : fallback;
    const min = finite(settings.minIntervalSec, 180, 15);
    const chatter: ChatterConfig = {
      enabled: settings.enabled !== false,
      minIntervalSec: min, maxIntervalSec: Math.max(min, finite(settings.maxIntervalSec, 360, 15)),
      bubbleSec: Math.min(30, finite(settings.bubbleSec, 7, 3)),
      solo: Array.isArray(settings.solo) && settings.solo.length && settings.solo.every((v: unknown) => typeof v === 'string') ? settings.solo : DEFAULT_CHATTER.solo,
      dialogues: Array.isArray(settings.dialogues) && settings.dialogues.length && settings.dialogues.every((v: unknown) => Array.isArray(v) && v.length === 2 && v.every((s) => typeof s === 'string')) ? settings.dialogues : DEFAULT_CHATTER.dialogues,
    };
    return { ...active, companions, chatter };
  } catch {
    return { ...active, chatter: DEFAULT_CHATTER };
  }
}
