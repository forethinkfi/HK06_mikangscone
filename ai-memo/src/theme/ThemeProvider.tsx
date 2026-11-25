import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { applyTheme, themes, type Customization, type Theme, type ThemeId } from './themes';
import { db, putSetting } from '../db';

interface ThemeCtx {
  theme: Theme;
  setThemeId: (id: ThemeId) => void;
  /** the single subscription lock. No payment yet – toggled from settings for preview. */
  isPro: boolean;
  setIsPro: (v: boolean) => void;
  custom: Customization;
  setCustom: (c: Customization) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const defaultCustom: Customization = { font: 'theme' };

export function ThemeProvider({ children }: { children: ReactNode }) {
  // live, so a theme picked in the panel re-skins every open note window too
  const rows = useLiveQuery(() => db.settings.bulkGet(['themeId', 'isPro', 'custom']));
  const loaded = rows !== undefined;
  const savedTheme = rows?.[0]?.value as ThemeId | undefined;
  const theme = themes[savedTheme && themes[savedTheme] ? savedTheme : 'pink-gyaru'];
  const isPro = Boolean(rows?.[1]?.value);
  const custom = (rows?.[2]?.value as Customization | undefined) ?? defaultCustom;

  useEffect(() => {
    if (loaded) applyTheme(theme, isPro ? custom : null);
  }, [loaded, theme, isPro, custom]);

  const value: ThemeCtx = {
    theme,
    setThemeId: (id) => void putSetting('themeId', id),
    isPro,
    setIsPro: (v) => void putSetting('isPro', v),
    custom,
    setCustom: (c) => void putSetting('custom', c),
  };
  // avoid a flash of the default theme before saved settings load
  return <Ctx.Provider value={value}>{loaded ? children : null}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme outside ThemeProvider');
  return v;
}
