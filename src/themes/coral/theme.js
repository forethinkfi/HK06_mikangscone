(function (root) {
  const id = 'coral-otter';
  root.Chars.CHARS[id] = {
    name: '해달', desc: '조약돌을 아끼는 하늘빛 해달', petId: id,
    color: '#bdd9ef', ink: '#37566e', className: 'coral-otter-avatar',
    voice: {
      description: '조약돌을 품은 해달이 옆에 앉아 조근조근 이야기해요.',
      greeting: () => '이쪽에 자리 있어요. 같이 앉을래요?',
      completed: ({ count }) => count ? `한 건 마쳤어요. 남은 일은 ${count}개예요.` : '오늘 할 일을 다 마쳤어요. 조개 소리 들으며 쉬어요.',
    },
  };
  root.Chars.ORDER.push(id);
  root.MemoThemes.register({
    id: 'coral', name: '산호빛 물가', character: id, petSpecies: id,
    preview: ['#cfe6f6', '#eef8fb', '#ffbdaf', '#e8a9bc'],
    sectionColors: ['#ffc6b5', '#f4b5bb', '#ffddbc', '#efb6c8', '#f5cdc2', '#f0aa91', '#eed6cd', '#eea4a2']
      .map(bg => ({ bg, ink: '#563936' })),
    noteColors: [
      { id: 'tide', name: '잔물결', bg: '#edf7fc', tab: '#badbec', ink: '#294b60' },
      { id: 'foam', name: '바다 거품', bg: '#f4fbfb', tab: '#cce7e8', ink: '#315258' },
      { id: 'pearl', name: '진주빛', bg: '#fff7f3', tab: '#f4d2c5', ink: '#594641' },
    ],
    paperShapes: ['shell'], paperLabels: { shell: '조개 편지지' },
  });
})(typeof self !== 'undefined' ? self : this);
