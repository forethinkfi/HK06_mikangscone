(function (root) {
  const id = 'basic-memoring';
  root.Chars.CHARS[id] = {
    name: '메모링', petId: id, desc: '함께 기록하는 작은 메모 패드', color: '#fff3c6',
    ink: '#3b2a22', className: 'memoring-avatar',
    voice: {
      description: '친근하고 정중한 존댓말을 쓰고 문장을 느낌표로 마쳐요!',
      morning: ({ count, next, time }) => count ? `좋은 아침이에요! 오늘 일정은 ${count}개예요! 첫 일정은 ${time} ‘${next}’예요!` : '좋은 아침이에요! 오늘 일정은 비어 있어요!',
      scheduleSoon: ({ minutes, title }) => `${minutes}분 뒤에 ‘${title}’ 일정이 있어요!`,
      scheduleNow: ({ title }) => `지금은 ‘${title}’ 시간이에요!`,
      outside: ({ temperature }) => ` 밖은 ${temperature}예요!`,
      weather: w => root.Chars.weatherDetails(w).replace(/\.$/, '!') + (w.snow ? ' 눈길 조심하세요!' : w.rain ? ' 우산도 챙겨 주세요!' : ''),
      lunch: ({ minutes }) => `점심까지 ${minutes}분 남았어요!`,
      oldNote: ({ weeks }) => `${weeks}주 만에 여는 메모예요! 다시 살펴볼까요!`,
      completed: ({ count }) => count ? `해냈어요! 남은 일은 ${count}개예요!` : '모두 마쳤어요! 수고하셨어요!',
      organized: ({ keyword, alarm }) => `‘${keyword}’ 메모를 정리했어요!` + (alarm ? ` ${alarm}에 알려드릴게요!` : ''),
      notFound: () => '관련 메모를 찾지 못했어요! 다른 단어로 찾아볼까요!',
      noteSummary: ({ notes, sections }) => `메모 ${notes}개를 섹션 ${sections}곳에 모아 뒀어요!`,
      greeting: () => '안녕하세요! 오늘도 함께 기록해요!',
      briefing: ({ count, list, next }) => (count ? `오늘 일정은 ${count}개예요! ${list}!` : '오늘 남은 일정은 없어요!') + (next ? ` 다음 알림은 ${next}예요!` : ''),
      petBriefing: ({ count, next, time }) => count ? `오늘 일정이 ${count}개 있어요! ${time}에 ‘${next}’부터 챙겨요!` : '오늘 일정을 모두 마쳤어요!',
    },
  };
  root.Chars.ORDER.unshift(id);
  const colors = [
    ['peach','피치','#fff1e9','#ffc5a7','#693c29'], ['sky','하늘','#edf6ff','#b8dcfa','#314b66'],
    ['lemon','레몬','#fff9df','#f5df87','#65532b'], ['mint','민트','#eaf8ef','#b3dfc5','#345844'],
    ['rose','로즈','#fff0f3','#f4c0cd','#693d49'], ['lilac','라일락','#f6f0ff','#d6c6ec','#564365'],
  ];
  root.MemoThemes.register({ id: 'basic', name: '기본', character: id, petSpecies: id,
    preview: ['#ffffff','#f4f4f5','#fef3c7','#18181b'],
    noteColors: colors.map(([id,name,bg,tape,ink]) => ({id,name,bg,tape,ink,tab:bg})),
  });
})(window);
