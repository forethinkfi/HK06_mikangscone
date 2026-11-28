import { expect, it } from 'vitest';
import { TipHistory, voiceTip } from './featureTips';

it('introduces new live features before older suggestions across restarts', () => {
  let saved = '';
  const storage = { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } };
  const tips = (...ids: string[]) => ids.map(id => ({ id, instruction: id }));
  const deck = new TipHistory(storage);
  expect(deck.next(tips('a', 'b', 'removed'))?.id).toBe('a');
  const restarted = new TipHistory(storage);
  expect(restarted.next(tips('a', 'b', 'new'))?.id).toBe('new');
  expect(restarted.next(tips('a', 'b', 'new'))?.id).toBe('b');
  expect(restarted.next(tips('a', 'b', 'new'))).toBeUndefined();
  expect(saved).not.toContain('removed');
});

it('keeps the same instructions in the five character voices', () => {
  const voices = ['basic-memoring', 'mono-cat', 'block-dino', 'pastel-octopus', 'vintage-teddy'];
  expect(new Set(voices.map(id => voiceTip(id, '나를 우클릭해'))).size).toBe(5);
});
