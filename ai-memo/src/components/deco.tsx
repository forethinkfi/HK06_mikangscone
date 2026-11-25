import { useEffect, useState } from 'react';
import type { AvatarKind } from '../theme/themes';

/** Large quilted bow for the top-right of the assistant card. */
export function Ribbon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 86" className={className} aria-hidden>
      <defs>
        <pattern id="rb-quilt" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0H10M0 0V10" stroke="rgba(255,255,255,.55)" strokeWidth="0.9" strokeDasharray="1.6 1.2" />
          <circle cx="0" cy="0" r="1.1" fill="#fff" />
        </pattern>
        <linearGradient id="rb-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".45" />
          <stop offset=".55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* tails */}
      <path d="M54 44 L34 82 L44 78 L48 86 L60 48Z" fill="var(--ribbon-shade)" />
      <path d="M66 44 L86 82 L76 78 L72 86 L60 48Z" fill="var(--ribbon-shade)" />
      {/* loops */}
      {[
        'M58 40 C40 14 10 6 6 24 C2 42 30 56 58 46Z',
        'M62 40 C80 14 110 6 114 24 C118 42 90 56 62 46Z',
      ].map((d) => (
        <g key={d}>
          <path d={d} fill="var(--ribbon)" stroke="var(--ribbon-shade)" strokeWidth="2" />
          <path d={d} fill="url(#rb-quilt)" />
          <path d={d} fill="url(#rb-shine)" />
        </g>
      ))}
      {/* knot with heart crystal */}
      <rect x="50" y="32" width="20" height="20" rx="7" fill="var(--ribbon-shade)" stroke="#fff" strokeWidth="1.5" />
      <path
        d="M60 48 C55 44 53 42 53 39.5 A3.2 3.2 0 0 1 60 38 A3.2 3.2 0 0 1 67 39.5 C67 42 65 44 60 48Z"
        fill="#F4F4F8"
        stroke="#C9C9D1"
        strokeWidth=".8"
      />
      <circle cx="57.5" cy="39.6" r="1" fill="#fff" />
    </svg>
  );
}

/** 13x9 pixel bow for the end of the bookmark tab. */
const PIXELS = [
  '.##.......##.',
  '#oo#.....#oo#',
  '#ooo#...#ooo#',
  '#oooo###oooo#',
  '#ooo#hhh#ooo#',
  '#oo##hhh##oo#',
  '.##.#####.##.',
  '....#o.o#....',
  '...#o#.#o#...',
];
export function PixelRibbon({ px = 2.6 }: { px?: number }) {
  const fill: Record<string, string> = { '#': 'var(--ribbon-shade)', o: 'var(--ribbon)', h: '#fff' };
  return (
    <svg width={13 * px} height={9 * px} viewBox="0 0 13 9" shapeRendering="crispEdges" aria-hidden>
      {PIXELS.flatMap((row, y) =>
        [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill[c]} />)),
      )}
    </svg>
  );
}

/** A loose string of pearls drawn along a curve. */
export function PearlCurve({ className = '', count = 22 }: { className?: string; count?: number }) {
  // shallow quadratic bezier from (0,5) via (100,36) to (200,7)
  const pts = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const x = 2 * (1 - t) * t * 100 + t ** 2 * 200;
    const y = (1 - t) ** 2 * 5 + 2 * (1 - t) * t * 36 + t ** 2 * 7;
    return [x, y];
  });
  return (
    <svg viewBox="-5 0 210 27" className={className} aria-hidden>
      <defs>
        <radialGradient id="pearl" cx=".35" cy=".3" r=".75">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".55" stopColor="#FBF3F7" />
          <stop offset="1" stopColor="#D9C9D3" />
        </radialGradient>
      </defs>
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 5 === 2 ? 5.4 : 4.4} fill="url(#pearl)" stroke="rgba(214,23,95,.35)" strokeWidth=".6" />
      ))}
    </svg>
  );
}

/** Little ✦ that twinkle in place. */
export function Twinkles({ spots }: { spots: { top: string; left: string; size: number; delay: number }[] }) {
  return (
    <>
      {spots.map((s, i) => (
        <span
          key={i}
          aria-hidden
          className="twinkle pointer-events-none absolute"
          style={{
            top: s.top,
            left: s.left,
            fontSize: s.size,
            color: 'var(--sparkle)',
            textShadow: '0 0 6px var(--ribbon-shade)',
            animationDelay: `${s.delay}s`,
          }}
        >
          ✦
        </span>
      ))}
    </>
  );
}

/** One quick burst of ✦ from the panel's top-left whenever `trigger` changes. */
export function SparkleBurst({ trigger }: { trigger: number }) {
  const [bits, setBits] = useState<{ id: number; dx: number; dy: number; size: number; top: number; left: number }[]>([]);
  useEffect(() => {
    if (!trigger) return;
    const n = 12;
    setBits(
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 0.9 - Math.PI * 0.05;
        const d = 60 + Math.random() * 70;
        return {
          id: trigger * 100 + i,
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d,
          size: 10 + Math.random() * 10,
          top: 40 + Math.random() * 30,
          left: 30 + Math.random() * 30,
        };
      }),
    );
    const t = setTimeout(() => setBits([]), 1000);
    return () => clearTimeout(t);
  }, [trigger]);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {bits.map((b) => (
        <span
          key={b.id}
          className="sparkle"
          style={{ top: b.top, left: b.left, fontSize: b.size, ['--dx' as string]: `${b.dx}px`, ['--dy' as string]: `${b.dy}px` }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}

/** Heart clip path, used by the optional heart frame in memo detail. */
export function HeartClipDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <clipPath id="heart-clip" clipPathUnits="objectBoundingBox">
        <path d="M0.5,0.97 C0.18,0.74 0,0.52 0,0.29 C0,0.12 0.13,0 0.28,0 C0.38,0 0.46,0.05 0.5,0.14 C0.54,0.05 0.62,0 0.72,0 C0.87,0 1,0.12 1,0.29 C1,0.52 0.82,0.74 0.5,0.97Z" />
      </clipPath>
    </svg>
  );
}

/** Built-in assistant characters (one per theme); Pro users can upload their own image. */
export function Avatar({ kind, image, size = 56 }: { kind: AvatarKind; image?: string; size?: number }) {
  const ring = {
    width: size,
    height: size,
    borderRadius: '9999px',
    background: '#fff',
    boxShadow: '0 0 0 3px var(--surface), 0 0 0 5px var(--ribbon-shade)',
  };
  // photos: keep the face in frame (portraits are usually top-heavy)
  if (image) return <img src={image} alt="" style={{ ...ring, objectFit: 'cover', objectPosition: '50% 40%' }} />;
  return (
    <div style={ring} className="overflow-hidden">
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
        <rect width="64" height="64" fill={kind === 'star' ? '#26262F' : kind === 'cat' ? '#EEF9C8' : '#FFD6E8'} />
        {kind === 'bunny' && (
          <>
            <ellipse cx="23" cy="16" rx="6" ry="15" fill="#fff" stroke="#3A1F2B" strokeWidth="2" />
            <ellipse cx="41" cy="16" rx="6" ry="15" fill="#fff" stroke="#3A1F2B" strokeWidth="2" />
            <ellipse cx="23" cy="17" rx="2.6" ry="10" fill="#FF9CC8" />
            <ellipse cx="41" cy="17" rx="2.6" ry="10" fill="#FF9CC8" />
            <circle cx="32" cy="42" r="19" fill="#fff" stroke="#3A1F2B" strokeWidth="2" />
            <path d="M44 24 l6 -4 l1 6 l-6 1z M44 24 l-5 -4 l-1 6 l6 -2z" fill="#FF5FA2" />
            <circle cx="25" cy="41" r="2.6" fill="#3A1F2B" />
            <circle cx="39" cy="41" r="2.6" fill="#3A1F2B" />
            <circle cx="24" cy="40" r=".9" fill="#fff" />
            <circle cx="38" cy="40" r=".9" fill="#fff" />
            <ellipse cx="21" cy="47" rx="3.5" ry="2" fill="#FF9CC8" />
            <ellipse cx="43" cy="47" rx="3.5" ry="2" fill="#FF9CC8" />
            <path d="M29 47 q3 3 6 0" stroke="#3A1F2B" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </>
        )}
        {kind === 'cat' && (
          <>
            <path d="M14 26 L18 8 L28 20Z M50 26 L46 8 L36 20Z" fill="#fff" stroke="#1C1D1A" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="32" cy="38" r="20" fill="#fff" stroke="#1C1D1A" strokeWidth="2" />
            <circle cx="25" cy="37" r="2.4" fill="#1C1D1A" />
            <circle cx="39" cy="37" r="2.4" fill="#1C1D1A" />
            <path d="M30 43 l2 2 l2 -2" stroke="#1C1D1A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M12 40 h8 M12 45 h8 M44 40 h8 M44 45 h8" stroke="#9FA39A" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )}
        {kind === 'star' && (
          <>
            <path
              d="M32 8 L38.5 23 L55 24.5 L42.5 35 L46.5 51 L32 42.5 L17.5 51 L21.5 35 L9 24.5 L25.5 23Z"
              fill="#E5E5EA"
              stroke="#fff"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle cx="27" cy="31" r="2.2" fill="#121216" />
            <circle cx="37" cy="31" r="2.2" fill="#121216" />
            <path d="M29 37 q3 2.5 6 0" stroke="#121216" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <circle cx="12" cy="54" r="1.4" fill="#E5E5EA" />
            <circle cx="54" cy="10" r="1.2" fill="#E5E5EA" />
          </>
        )}
      </svg>
    </div>
  );
}
