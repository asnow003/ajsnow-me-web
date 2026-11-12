'use client';

import { useCallback, useEffect, useState } from 'react';
import { THEME_KEY } from './theme-key';

// Appearance for flashcards: follow the device, or always light or dark. Saved per device.
export type Theme = 'system' | 'light' | 'dark';


function root(): HTMLElement | null {
  return document.getElementById('fc-root');
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    const current = root()?.dataset.theme;
    if (current === 'light' || current === 'dark') setThemeState(current);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    const el = root();
    if (el) el.dataset.theme = next;
    try {
      if (next === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private browsing: the choice lasts until the page is closed.
    }
  }, []);

  return [theme, setTheme];
}
