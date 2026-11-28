import type { FeatureTip } from '../shared/ipcContract';

const key = 'peekit-feature-history-v1';
type HistoryEntry = { id: string; heard: boolean };

export class TipHistory {
  private entries: HistoryEntry[] = [];
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'>) {
    try {
      const saved = JSON.parse(storage.getItem(key) ?? '[]');
      if (Array.isArray(saved)) this.entries = saved.filter(entry => typeof entry?.id === 'string' && typeof entry.heard === 'boolean');
    } catch { /* Fresh history if the saved value is unavailable. */ }
  }

  next(tips: FeatureTip[]) {
    const live = new Map(tips.map(tip => [tip.id, tip]));
    const current = this.entries.filter(entry => live.has(entry.id));
    const known = new Set(current.map(entry => entry.id));
    const added = [...live.keys()].filter(id => !known.has(id)).map(id => ({ id, heard: false }));
    const entries = [...added, ...current];
    const next = entries.find(entry => !entry.heard);
    if (next) next.heard = true;
    if (next || entries.length !== this.entries.length) {
      this.entries = entries;
      try { this.storage.setItem(key, JSON.stringify(entries)); } catch { /* Keep session history. */ }
    }
    return next && live.get(next.id);
  }
}

export function voiceTip(species: string, instruction: string) {
  switch (species) {
    case 'mono-cat': return instruction + ' 봐.';
    case 'block-dino': return '자네, ' + instruction + ' 보게.';
    case 'pastel-octopus': return instruction + ' 볼래요?';
    case 'vintage-teddy': return '주인님, ' + instruction + ' 보시겠습니까?';
    default: return instruction + ' 보세요!';
  }
}
