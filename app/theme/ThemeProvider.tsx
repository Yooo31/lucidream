import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { SystemClock, type Clock } from '../domain';

import { THEME_PALETTES } from './colors';
import { ThemeEngine } from './ThemeEngine';
import type { ThemeSettingsRepository } from './ThemeSettingsRepository';
import { assertSleepWindow, type SleepWindow, type ThemeName } from './types';

const THEME_TICK_INTERVAL_MS = 60_000;

export const DEFAULT_SLEEP_WINDOW: SleepWindow = {
  startMinutes: 23 * 60,
  endMinutes: 7 * 60,
};

interface ThemeContextValue {
  themeName: ThemeName;
  sleepWindow: SleepWindow;
  manualThemeOverride: ThemeName | null;
  colors: (typeof THEME_PALETTES)[ThemeName];
  setManualThemeOverride: (themeName: ThemeName | null) => void;
  setSleepWindow: (sleepWindow: SleepWindow) => Promise<void>;
}

interface ThemeProviderProps extends PropsWithChildren {
  clock?: Clock;
  settingsRepository?: ThemeSettingsRepository;
}

const noopAsync = () => Promise.resolve();

const defaultThemeContextValue: ThemeContextValue = {
  themeName: 'dark',
  sleepWindow: DEFAULT_SLEEP_WINDOW,
  manualThemeOverride: null,
  colors: THEME_PALETTES.dark,
  setManualThemeOverride: () => {},
  setSleepWindow: noopAsync,
};

const ThemeContext = createContext<ThemeContextValue>(defaultThemeContextValue);

export function ThemeProvider({ children, clock, settingsRepository }: ThemeProviderProps) {
  const systemClockRef = useRef<Clock>(new SystemClock());
  const activeClock = clock ?? systemClockRef.current;

  const [sleepWindow, setSleepWindowState] = useState<SleepWindow>(DEFAULT_SLEEP_WINDOW);
  const [manualThemeOverride, setManualThemeOverride] = useState<ThemeName | null>(null);
  const [, setThemeTick] = useState(0);

  useEffect(() => {
    let isMounted = true;

    if (!settingsRepository) {
      return () => {
        isMounted = false;
      };
    }

    settingsRepository
      .getSleepWindow()
      .then((storedSleepWindow) => {
        if (!isMounted || storedSleepWindow === null) {
          return;
        }

        setSleepWindowState(storedSleepWindow);
      })
      .catch(() => {
        // Keep safe defaults when settings cannot be loaded.
      });

    return () => {
      isMounted = false;
    };
  }, [settingsRepository]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setThemeTick((current) => current + 1);
    }, THEME_TICK_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const setSleepWindow = useCallback(
    async (nextSleepWindow: SleepWindow) => {
      assertSleepWindow(nextSleepWindow);

      if (settingsRepository) {
        await settingsRepository.saveSleepWindow(nextSleepWindow);
      }

      setSleepWindowState(nextSleepWindow);
    },
    [settingsRepository],
  );

  const themeName = new ThemeEngine(activeClock).resolveActiveTheme({
    sleepWindow,
    manualThemeOverride,
  });

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName,
      sleepWindow,
      manualThemeOverride,
      colors: THEME_PALETTES[themeName],
      setManualThemeOverride,
      setSleepWindow,
    }),
    [themeName, sleepWindow, manualThemeOverride, setSleepWindow],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
