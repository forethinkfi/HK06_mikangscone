(() => {
  const dayKey = d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  function due(now, settings, since, letters) {
    const slot = new Date(now);
    const [hour, minute] = settings.letterTime.split(':').map(Number);
    slot.setDate(slot.getDate() - (slot.getDay() - settings.letterDay + 7) % 7);
    slot.setHours(hour, minute, 0, 0);
    if (+slot > now) slot.setDate(slot.getDate() - 7);
    if (+slot < since) return null;
    const monday = new Date(slot);
    monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
    monday.setHours(0, 0, 0, 0);
    const week = dayKey(monday);
    return letters.some(letter => letter.week === week) ? null : { at: +slot, week };
  }
  function summary(notes, at) {
    const start = new Date(at); start.setDate(start.getDate() - 7);
    const nextWeek = new Date(at); nextWeek.setDate(nextWeek.getDate() + 7 - (nextWeek.getDay() + 6) % 7);
    nextWeek.setHours(0, 0, 0, 0);
    const end = new Date(nextWeek); end.setDate(end.getDate() + 7);
    const events = notes.flatMap(note => note.events || []).sort((a,b) => a.at-b.at);
    const done = events.filter(e => e.done && (e.doneAt ?? e.at) > +start && (e.doneAt ?? e.at) <= at);
    const pending = events.filter(e => !e.done && e.at < +nextWeek);
    const next = events.find(e => !e.done && e.at >= +nextWeek && e.at < +end);
    const titles = list => list.slice(0,3).map(e => e.title).join(' · ') + (list.length > 3 ? ` 외 ${list.length-3}건` : '');
    return { done: titles(done), pending: titles(pending), next: next && { title: next.title, at: next.at, allDay: next.allDay },
      notes: notes.filter(n => n.createdAt > +start && n.createdAt <= at && (n.text || n.title || n.photos?.length)).length };
  }
  globalThis.WeeklyLetter = {due, summary};
})();
