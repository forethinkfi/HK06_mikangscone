import { beads, dotGrid, glitter, leopard, quilted } from './patterns';
// 치치 사진은 저작권이 있는 캐릭터라 git에 올리지 않는다 (src/assets/chichi.png, .gitignore).
// 파일이 없으면 빈 객체가 돼서 그려진 토끼 캐릭터로 보인다.
const optionalPhotos = import.meta.glob<string>('../assets/chichi.png', { eager: true, import: 'default' });
const chichiPhoto: string | undefined = Object.values(optionalPhotos)[0];

/**
 * One object describes everything a theme changes: colours, fonts, the panel background,
 * the card border, the accent card fill and which decorations are drawn.
 * applyTheme() turns it into CSS variables, so swapping the object re-skins the whole app.
 */
export interface Theme {
  id: ThemeId;
  name: string;
  /** a short line for the theme picker */
  blurb: string;
  colors: {
    /** page / window background colour behind the pattern */
    bg: string;
    /** card inside – text always sits on this solid colour */
    surface: string;
    /** secondary solid surface (pills, inputs) */
    surfaceAlt: string;
    text: string;
    textMuted: string;
    /** the theme's point colour (buttons, today pill, progress) */
    accent: string;
    /** text colour on top of `accent` */
    onAccent: string;
    /** a softer tint of accent for chips and tracks */
    accentSoft: string;
    /** black pill / round buttons */
    ink: string;
    onInk: string;
    /** plain card outline where beads are not used */
    line: string;
    /** big-title glow colour */
    glow: string;
    /** text on the accent card's patterned fill (only used for large titles) */
    heroText: string;
    focus: string;
  };
  fonts: { display: string; body: string };
  /** big display titles: white sticker text with an outline glow on the decorated themes */
  title: { color: string; shadow: string };
  /** CSS `background` shorthand for the window */
  pattern: string;
  /** CSS `background` for the decorative ring around every card */
  border: string;
  borderWidth: number;
  /** CSS `background` for the main (accent) card */
  heroFill: string;
  /** default memo colours offered by this theme (free users pick from these) */
  memoColors: string[];
  deco: {
    ribbon: boolean;
    pixelRibbon: boolean;
    sparkles: boolean;
    pearlCurve: boolean;
    lace: boolean;
    sparkleColor: string;
    ribbonColor: string;
    ribbonShade: string;
  };
  /** `image` replaces the drawn character when set */
  assistant: { name: string; avatar: AvatarKind; image?: string };
}

export type ThemeId = 'pink-gyaru' | 'clean-white' | 'dark-glitter';
export type AvatarKind = 'bunny' | 'cat' | 'star';

const PINK = '#FF5FA2';
const PINK_MID = '#FF9CC8';
const PINK_LIGHT = '#FFD6E8';
const SILVER = '#E5E5EA';
const CHERRY = '#D6175F'; // white on cherry = 5.1:1 (AA)
const INK_TEXT = '#3A1F2B';
/** 온글잎 박다현체 – the app's default font in every theme */
const HANDWRITING = "'Ownglyph PDH', 'Pretendard', sans-serif";

/** 1.5px outline in `c` drawn with text-shadows, plus a soft glow in `glow`. */
function outline(c: string, glow: string) {
  const o = [
    [1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5], [1.1, 1.1], [-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [0, 2.6],
  ].map(([x, y]) => `${x}px ${y}px 0 ${c}`);
  return [...o, `0 0 12px ${glow}`].join(', ');
}

export const themes: Record<ThemeId, Theme> = {
  'pink-gyaru': {
    id: 'pink-gyaru',
    name: '핑크 갸루',
    blurb: '호피·큐빅·리본 데코',
    colors: {
      bg: '#F6E4EC',
      surface: '#FFFFFF',
      surfaceAlt: PINK_LIGHT,
      text: INK_TEXT,
      textMuted: '#7A4A5E', // 7.5:1 on white, 5.6:1 on #FFD6E8
      accent: CHERRY,
      onAccent: '#FFFFFF',
      accentSoft: PINK_LIGHT,
      ink: '#2A1520',
      onInk: '#FFFFFF',
      line: PINK_MID,
      glow: PINK,
      heroText: '#FFFFFF',
      focus: CHERRY,
    },
    fonts: { display: HANDWRITING, body: HANDWRITING },
    // white letters, cherry outline (5.1:1 against white) + soft pink glow
    title: { color: '#FFFFFF', shadow: outline(CHERRY, PINK) },
    pattern: leopard('#F5E9EF', '#F2B8D1', '#7F7680', 200),
    border: beads('#FBFBFD', '#C9C9D1', 9),
    borderWidth: 9,
    heroFill: quilted('#FF6BAA', '#C8155A', 'rgba(255,255,255,.55)', SILVER),
    memoColors: [PINK, PINK_MID, '#C9C9D1', '#B7136A'],
    deco: {
      ribbon: true,
      pixelRibbon: true,
      sparkles: true,
      pearlCurve: true,
      lace: true,
      sparkleColor: '#FFFFFF',
      ribbonColor: PINK_MID,
      ribbonShade: PINK,
    },
    assistant: { name: '치치', avatar: 'bunny', image: chichiPhoto },
  },

  'clean-white': {
    id: 'clean-white',
    name: '깔끔한 화이트',
    blurb: '라임 포인트, 그레이 톤',
    colors: {
      bg: '#E9EAE6',
      surface: '#FFFFFF',
      surfaceAlt: '#F1F2EE',
      text: '#1C1D1A',
      textMuted: '#5D605A',
      accent: '#D2F25C',
      onAccent: '#1C1D1A', // 14:1
      accentSoft: '#EEF9C8',
      ink: '#1C1D1A',
      onInk: '#FFFFFF',
      line: '#DADBD6',
      glow: 'transparent',
      heroText: '#1C1D1A',
      focus: '#5E7A00',
    },
    fonts: { display: HANDWRITING, body: HANDWRITING },
    title: { color: '#1C1D1A', shadow: 'none' },
    pattern: dotGrid('#E9EAE6', '#D3D4CF'),
    border: 'linear-gradient(#DADBD6, #DADBD6)',
    borderWidth: 1,
    heroFill: 'linear-gradient(150deg, #DDF77A, #C4EA3E)',
    memoColors: ['#C4EA3E', '#9FA39A', '#1C1D1A', '#E4E6DF'],
    deco: {
      ribbon: false,
      pixelRibbon: false,
      sparkles: false,
      pearlCurve: false,
      lace: false,
      sparkleColor: '#C4EA3E',
      ribbonColor: '#C4EA3E',
      ribbonShade: '#9DBE22',
    },
    assistant: { name: '모모', avatar: 'cat' },
  },

  'dark-glitter': {
    id: 'dark-glitter',
    name: '다크 글리터',
    blurb: '검정 바탕에 실버 큐빅',
    colors: {
      bg: '#0D0D11',
      surface: '#1B1B22',
      surfaceAlt: '#26262F',
      text: '#F2F2F5',
      textMuted: '#B4B4BF', // 8.4:1 on #1B1B22
      accent: SILVER,
      onAccent: '#121216',
      accentSoft: '#33333D',
      ink: SILVER,
      onInk: '#121216',
      line: '#3A3A45',
      glow: '#FFFFFF',
      heroText: '#FFFFFF',
      focus: SILVER,
    },
    fonts: { display: HANDWRITING, body: HANDWRITING },
    title: { color: '#FFFFFF', shadow: '0 0 10px rgba(229,229,234,.55)' },
    pattern: glitter('#0D0D11', SILVER),
    border: beads('#F4F4F8', '#8A8A96', 8),
    borderWidth: 8,
    heroFill: quilted('#3A3A46', '#121217', 'rgba(229,229,234,.45)', SILVER),
    memoColors: [SILVER, '#8A8A96', '#5B5B66', '#FF9CC8'],
    deco: {
      ribbon: true,
      pixelRibbon: true,
      sparkles: true,
      pearlCurve: true,
      lace: false,
      sparkleColor: SILVER,
      ribbonColor: '#C9C9D1',
      ribbonShade: '#8A8A96',
    },
    assistant: { name: '루나', avatar: 'star' },
  },
};

export const themeList = Object.values(themes);

export const fontChoices = [
  { id: 'theme', label: '온글잎 박다현체 (기본)', css: '' },
  { id: 'jua', label: '주아', css: "'Jua', sans-serif" },
  { id: 'gowun', label: '고운돋움', css: "'Gowun Dodum', sans-serif" },
  { id: 'dohyeon', label: '도현', css: "'Do Hyeon', sans-serif" },
  { id: 'pretendard', label: '프리텐다드', css: "'Pretendard', sans-serif" },
] as const;
export type FontChoice = (typeof fontChoices)[number]['id'];

/** Pro customisations layered over the selected theme. Ignored unless isPro. */
export interface Customization {
  memoColor?: string;
  avatarImage?: string; // data URL
  backgroundImage?: string; // data URL
  font: FontChoice;
}

export function applyTheme(theme: Theme, custom: Customization | null) {
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(theme.colors)) {
    root.setProperty(`--${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`, v);
  }
  const font = custom ? fontChoices.find((f) => f.id === custom.font)?.css : '';
  root.setProperty('--font-display', font || theme.fonts.display);
  root.setProperty('--font-body', font || theme.fonts.body);
  root.setProperty('--pattern', theme.pattern);
  // the panel itself has no background, so cards float over the desktop – unless a Pro user picked an image
  root.setProperty(
    '--panel-bg',
    custom?.backgroundImage ? `center / cover no-repeat url("${custom.backgroundImage}")` : 'transparent',
  );
  root.setProperty('--title-color', theme.title.color);
  root.setProperty('--title-shadow', theme.title.shadow);
  root.setProperty('--border', theme.border);
  root.setProperty('--border-w', `${theme.borderWidth}px`);
  root.setProperty('--hero-fill', theme.heroFill);
  root.setProperty('--sparkle', theme.deco.sparkleColor);
  root.setProperty('--ribbon', theme.deco.ribbonColor);
  root.setProperty('--ribbon-shade', theme.deco.ribbonShade);
  document.documentElement.dataset.theme = theme.id;
  document.documentElement.style.colorScheme = theme.id === 'dark-glitter' ? 'dark' : 'light';
}
