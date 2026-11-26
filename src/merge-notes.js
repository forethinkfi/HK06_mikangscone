// Shared by the desktop renderer and the merge regression tests.
(() => {
  function bodyOf(notes) {
    const seen = new Set();
    const parts = [];
    for (const note of notes) {
      for (const part of (note.text?.trim() || note.title || note.keyword || '').split(/\r?\n\s*\r?\n/)) {
        const text = part.trim();
        if (text && !seen.has(text)) { seen.add(text); parts.push(text); }
      }
    }
    return parts.join('\n\n');
  }
  function draft(notes, title) {
    const events = new Map();
    for (const event of notes.flatMap(n => n.events || [])) {
      const { id, ...details } = event;
      events.set(JSON.stringify(details), { ...event });
    }
    return {
      title, text: bodyOf(notes), sectionId: notes[0].sectionId || '',
      photos: [...new Set(notes.flatMap(n => n.photos || []))],
      stickers: notes.flatMap(n => structuredClone(n.stickers || [])),
      events: [...events.values()].sort((a,b) => a.at - b.at),
      pinned: notes.some(n => n.pinned),
    };
  }
  function pairs(raw, count) {
    const used = new Set();
    return (Array.isArray(raw) ? raw : []).filter(pair => {
      if (!pair || typeof pair.title !== 'string' || !pair.title.trim()) return false;
      const ids = [pair.first, pair.second];
      if (ids[0] === ids[1] || ids.some(i => !Number.isInteger(i) || i < 0 || i >= count || used.has(i))) return false;
      ids.forEach(i => used.add(i));
      return true;
    });
  }
  const api = { draft, pairs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.MemoMerge = api;
})();
