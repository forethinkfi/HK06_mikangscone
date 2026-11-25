type Mark = [path: string, fill?: string];

export const menuIcons = {
  fish: [
    ['M12 44 Q16 25 43 12 L47 15 Q26 28 17 47 Q14 51 12 44Z', '#d8a477'],
    ['M45 13 Q54 17 48 31 Q45 39 49 44'],
    ['M39 50 Q42 42 51 45 L61 42 L58 49 L61 55 L52 53 Q44 58 39 50Z', '#ffbe68'],
    ['M46 49 L46.3 49'], ['M23 14 L25 20 M18 20 L21 23'],
  ],
  cat: [
    ['M16 33 L17 20 Q18 17 29 28 Q37 25 45 29 Q52 20 54 22 L54 42 Q53 56 36 58 Q16 57 16 40Z', '#b6a3e5'],
    ['M15 32 Q30 27 27 12 Q31 7 43 16 L47 25 Q61 26 56 32 Q37 40 15 36Z', '#8c70c6'],
    ['M34 23 L38 17 L40 22 L46 22 L42 26 L43 31 L38 28 L33 30 L34 25Z', '#ffe285'],
    ['M27 44 L27.3 44 M44 44 L44.3 44 M34 49 Q37 53 40 49'],
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
