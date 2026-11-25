let texture: string | undefined;

export function paperTexture() {
  if (texture) return texture;
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 288;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'none';

  let seed = 2813;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const { width, height } = canvas;
  const grain = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = (y * width + x) * 4;
      const pulp = 2.2 * Math.sin(x * 0.034 + y * 0.041) + 1.7 * Math.cos(x * 0.071 - y * 0.042);
      const tooth = pulp + (random() - 0.52) * 17 + (random() - 0.50) * 8;
      grain.data[d] = 249 + tooth;
      grain.data[d + 1] = 242 + tooth;
      grain.data[d + 2] = 222 + tooth;
      grain.data[d + 3] = 255;
    }
  }
  ctx.putImageData(grain, 0, 0);

  ctx.lineCap = 'round';
  for (let i = 0; i < 2300; i++) {
    const x = random() * width;
    const y = random() * height;
    const length = 1.1 + random() * 4.3;
    const angle = random() * Math.PI * 2;
    ctx.lineWidth = 0.36 + random() * 0.55;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(108, 78, 52, .17)' : 'rgba(255, 254, 242, .49)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }
  texture = `url(${canvas.toDataURL('image/png')})`;
  return texture;
}
