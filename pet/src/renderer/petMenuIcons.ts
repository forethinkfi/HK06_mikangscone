type Mark = [path: string, fill?: string];

export const menuIcons = {
  note: [
    ['M16 13 L55 13 L55 47 L44 58 L16 58Z', '#f7ecd7'],
    ['M44 58 L44 47 L55 47 M23 26 L47 26 M23 34 L43 34 M23 42 L35 42'],
  ],
  focus: [
    ['M14 22 Q25 18 36 25 Q47 18 58 22 L58 51 Q46 48 36 55 Q25 48 14 51Z', '#f9e9b1'],
    ['M36 25 L36 55 M20 30 Q26 29 31 32 M41 32 Q47 29 52 30'],
  ],
  fish: [
    ['M12 44 Q16 25 43 12 L47 15 Q26 28 17 47 Q14 51 12 44Z', '#d8a477'],
    ['M45 13 Q54 17 48 31 Q45 39 49 44'],
    ['M39 50 Q42 42 51 45 L61 42 L58 49 L61 55 L52 53 Q44 58 39 50Z', '#ffbe68'],
    ['M46 49 L46.3 49'], ['M23 14 L25 20 M18 20 L21 23'],
  ],
  cat: [
    ['M14 33 L16 16 Q17 13 29 25 Q37 22 44 26 Q51 16 56 18 L58 39 Q57 57 36 59 Q14 58 14 39Z', '#29272d'],
    ['M21 39 A7 9 0 1 0 35 39 A7 9 0 1 0 21 39Z M39 40 A7 9 0 1 0 53 40 A7 9 0 1 0 39 40Z', '#fff9ed'],
    ['M28 37v5 M46 38v5'],
  ],
  add: [
    ['M21 15 L50 20 L48 59 L16 55Z', '#f5c86e'],
    ['M15 12 L45 15 L46 53 L12 52Z', '#fff1a1'],
    ['M21 24 L36 25 M20 32 L33 33 M19 40 L30 41'],
    ['M37 45 L52 17 Q54 14 59 18 Q61 20 59 23 L43 49 L35 52Z', '#f3a29f'],
    ['M50 22 L57 26 M37 45 L43 49'],
  ],
  today: [
    ['M13 24 Q13 17 21 17 L51 16 Q57 16 58 24 L58 52 Q58 57 53 57 L18 58 Q13 58 13 52Z', '#aeebd4'],
    ['M13 29 L58 28 M24 11 L23 22 M46 11 L47 22'],
    ['M22 39 L23 39 M33 39 L34 39 M45 39 L46 39 M22 49 L23 49'],
    ['M34 48 L40 52 L48 45'],
  ],
  exit: [
    ['M19 56 L19 15 L49 14 L49 56Z', '#edb09c'],
    ['M20 16 L39 23 L39 60 L20 55Z', '#ffcfba'],
    ['M31 39 L32 39 M48 35 L62 35 M57 30 L62 35 L57 40'],
    ['M11 56 L19 56 M39 59 L52 59'],
  ],
  hide: [
    ['M9 39 Q20 22 36 22 Q52 22 63 39 Q52 55 36 55 Q20 55 9 39Z', '#c5d9ea'],
    ['M35 32 A7 7 0 1 0 37 46 A7 7 0 0 0 35 32Z', '#8db4d5'],
    ['M14 59 L58 17'],
  ],
} satisfies Record<string, Mark[]>;

export function drawMenuIcon(name: keyof typeof menuIcons) {
  const canvas = document.createElement('canvas');
  canvas.className = 'pet-menu-icon';
  canvas.width = 144;
  canvas.height = 144;
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  context.scale(2, 2);
  context.strokeStyle = '#26202b';
  context.lineWidth = 2.6;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  for (const [drawing, fill] of menuIcons[name]) {
    const path = new Path2D(drawing);
    if (fill) { context.fillStyle = fill; context.fill(path); }
    context.stroke(path);
  }
  return canvas;
}
