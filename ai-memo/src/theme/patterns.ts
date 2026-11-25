// Background patterns drawn from scratch as SVG tiles (no reference images used).

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** Small deterministic PRNG so the tile is identical on every load. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Leopard print: soft pink spot in the middle, a broken ring of grey blobs around it.
 * Rosettes near an edge are drawn again on the opposite side so the tile wraps seamlessly.
 */
export function leopard(base: string, spot: string, ring: string, size = 180): string {
  const r = rng(7);
  const shapes: string[] = [];
  type Seg = { a0: number; a1: number; k: number; w: number };
  // a rosette's shape is decided once (segments), so the wrapped copies match
  const rosette = (cx: number, cy: number, scale: number, rot: number, segs: Seg[]) => {
    const rx = 10.5 * scale;
    const ry = 7.5 * scale;
    const arcs = segs
      .map(({ a0, a1, k, w }) => {
        const x0 = cx + Math.cos(a0) * rx * k;
        const y0 = cy + Math.sin(a0) * ry * k;
        const x1 = cx + Math.cos(a1) * rx * k;
        const y1 = cy + Math.sin(a1) * ry * k;
        return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)}A${(rx * k).toFixed(1)} ${(ry * k).toFixed(1)} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke-width="${(w * scale).toFixed(1)}"/>`;
      })
      .join('');
    // soft pink centre + uneven grey crescents around it
    return `<g transform="rotate(${rot} ${cx.toFixed(1)} ${cy.toFixed(1)})"><ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(rx * 0.92).toFixed(1)}" ry="${(ry * 0.88).toFixed(1)}" fill="${spot}"/><g fill="none" stroke="${ring}" stroke-linecap="round">${arcs}</g></g>`;
  };
  const makeSegs = (): Seg[] => {
    const n = 3 + Math.floor(r() * 2);
    const start = r() * Math.PI * 2;
    const segs: Seg[] = [];
    let a = start;
    for (let i = 0; i < n; i++) {
      const span = ((Math.PI * 2) / n) * (0.45 + r() * 0.3);
      segs.push({ a0: a, a1: a + span, k: 1.12 + r() * 0.2, w: 4.2 + r() * 3.4 });
      a += (Math.PI * 2) / n;
    }
    return segs;
  };

  const cells = 4;
  const step = size / cells;
  for (let gy = 0; gy < cells; gy++) {
    for (let gx = 0; gx < cells; gx++) {
      if (r() < 0.12) continue;
      const cx = gx * step + step / 2 + (r() - 0.5) * step * 0.5 + (gy % 2) * step * 0.3;
      const cy = gy * step + step / 2 + (r() - 0.5) * step * 0.4;
      const scale = 0.7 + r() * 0.5;
      const rot = Math.floor(r() * 180);
      const segs = makeSegs();
      for (const dx of [-size, 0, size]) {
        for (const dy of [-size, 0, size]) {
          shapes.push(rosette(cx + dx, cy + dy, scale, rot, segs));
        }
      }
      // a lone dot between rosettes
      if (r() < 0.5) {
        const sx = (cx + step * 0.45) % size;
        const sy = (cy + step * 0.4) % size;
        shapes.push(`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(2 + r() * 1.5).toFixed(1)}" fill="${ring}"/>`);
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${base}"/>${shapes.join('')}</svg>`;
  return `${svgUrl(svg)} 0 0 / ${size}px ${size}px repeat`;
}

/** Scattered silver glitter on near-black. */
export function glitter(base: string, dot: string, size = 140): string {
  const r = rng(21);
  const dots: string[] = [];
  for (let i = 0; i < 46; i++) {
    const x = (r() * size).toFixed(1);
    const y = (r() * size).toFixed(1);
    const rad = (0.5 + r() * 1.3).toFixed(1);
    const o = (0.25 + r() * 0.6).toFixed(2);
    dots.push(`<circle cx="${x}" cy="${y}" r="${rad}" fill="${dot}" opacity="${o}"/>`);
  }
  // a few four-point twinkles
  for (let i = 0; i < 4; i++) {
    const x = r() * size;
    const y = r() * size;
    const s = 3 + r() * 3;
    dots.push(
      `<path d="M${x} ${y - s}L${x + s * 0.25} ${y - s * 0.25}L${x + s} ${y}L${x + s * 0.25} ${y + s * 0.25}L${x} ${y + s}L${x - s * 0.25} ${y + s * 0.25}L${x - s} ${y}L${x - s * 0.25} ${y - s * 0.25}Z" fill="${dot}" opacity="0.8"/>`,
    );
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${base}"/>${dots.join('')}</svg>`;
  return `${svgUrl(svg)} 0 0 / ${size}px ${size}px repeat`;
}

/** Quiet dot grid for the clean white theme. */
export function dotGrid(base: string, dot: string): string {
  return `radial-gradient(circle, ${dot} 1px, transparent 1.4px) 0 0 / 18px 18px, ${base}`;
}

/** Quilted (diamond-stitched) fill with rhinestones at the seams. */
export function quilted(from: string, to: string, seam: string, stone: string, t = 30): string {
  const h = t / 2;
  const gem = (x: number, y: number) =>
    `<circle cx="${x}" cy="${y}" r="2.1" fill="${stone}"/><circle cx="${x - 0.6}" cy="${y - 0.6}" r="0.7" fill="#fff"/>`;
  // stitched diagonals + a rhinestone where seams cross (tile centre and corners)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}"><path d="M0 0L${t} ${t}M${t} 0L0 ${t}" stroke="${seam}" stroke-width="1.1" stroke-dasharray="2.2 1.6"/><g fill="#fff" opacity=".16"><ellipse cx="${h}" cy="0" rx="${h * 0.55}" ry="${h * 0.4}"/><ellipse cx="${h}" cy="${t}" rx="${h * 0.55}" ry="${h * 0.4}"/><ellipse cx="0" cy="${h}" rx="${h * 0.55}" ry="${h * 0.4}"/><ellipse cx="${t}" cy="${h}" rx="${h * 0.55}" ry="${h * 0.4}"/></g>${gem(h, h)}${gem(0, 0)}${gem(t, 0)}${gem(0, t)}${gem(t, t)}</svg>`;
  return [
    `${svgUrl(svg)} 0 0 / ${t}px ${t}px`,
    `radial-gradient(120% 90% at 20% 0%, rgba(255,255,255,.30), transparent 60%)`,
    `linear-gradient(150deg, ${from}, ${to})`,
  ].join(', ');
}

/** Pearl / crystal chain: one row of glossy beads painted into the card's border ring. */
export function beads(core: string, edge: string, size: number): string {
  return `radial-gradient(circle at 38% 34%, #fff 0 14%, ${core} 34%, ${edge} 62%, transparent 68%) 0 0 / ${size}px ${size}px round`;
}
