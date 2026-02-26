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
import {
  assertSleepWindow,
  DEFAULT_THEME_SETTINGS,
  type SleepWindow,
  type ThemeName,
  type ThemeSettings,
} from './types';

const THEME_TICK_INTERVAL_MS = 60_000;

interface ThemeContextValue {
  themeName: ThemeName;
  sleepWindow: SleepWindow;
  autoInfraredEnabled: boolean;
  manualThemeOverride: ThemeName | null;
  colors: (typeof THEME_PALETTES)[ThemeName];
  setManualThemeOverride: (themeName: ThemeName | null) => void;
  setSleepWindow: (sleepWindow: SleepWindow) => Promise<void>;
  setAutoInfraredEnabled: (enabled: boolean) => Promise<void>;
  applyThemeSettings: (themeSettings: ThemeSettings) => void;
}

interface ThemeProviderProps extends PropsWithChildren {
  clock?: Clock;
  settingsRepository?: ThemeSettingsRepository;
}

const noopAsync = () => Promise.resolve();

const defaultThemeContextValue: ThemeContextValue = {
  themeName: 'dark',
  sleepWindow: DEFAULT_THEME_SETTINGS.sleepWindow,
  autoInfraredEnabled: DEFAULT_THEME_SETTINGS.autoInfraredEnabled,
  manualThemeOverride: null,
  colors: THEME_PALETTES.dark,
  setManualThemeOverride: () => {},
  setSleepWindow: noopAsync,
  setAutoInfraredEnabled: noopAsync,
  applyThemeSettings: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(defaultThemeContextValue);

export function ThemeProvider({ children, clock, settingsRepository }: ThemeProviderProps) {
  const systemClockRef = useRef<Clock>(new SystemClock());
  const activeClock = clock ?? systemClockRef.current;

  const [sleepWindow, setSleepWindowState] = useState<SleepWindow>(
    DEFAULT_THEME_SETTINGS.sleepWindow,
  );
  const [autoInfraredEnabled, setAutoInfraredEnabledState] = useState<boolean>(
    DEFAULT_THEME_SETTINGS.autoInfraredEnabled,
  );
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
      .getThemeSettings()
      .then((storedSettings) => {
        if (!isMounted || storedSettings === null) {
          return;
        }

        setSleepWindowState(storedSettings.sleepWindow);
        setAutoInfraredEnabledState(storedSettings.autoInfraredEnabled);
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

  const applyThemeSettings = useCallback((themeSettings: ThemeSettings) => {
    assertSleepWindow(themeSettings.sleepWindow);
    setSleepWindowState(themeSettings.sleepWindow);
    setAutoInfraredEnabledState(themeSettings.autoInfraredEnabled);

    if (themeSettings.autoInfraredEnabled) {
      setManualThemeOverride(null);
    }
  }, []);

  const setSleepWindow = useCallback(
    async (nextSleepWindow: SleepWindow) => {
      assertSleepWindow(nextSleepWindow);
      const nextSettings: ThemeSettings = {
        sleepWindow: nextSleepWindow,
        autoInfraredEnabled,
      };

      if (settingsRepository) {
        await settingsRepository.saveThemeSettings(nextSettings);
      }

      applyThemeSettings(nextSettings);
    },
    [applyThemeSettings, autoInfraredEnabled, settingsRepository],
  );

  const setAutoInfraredEnabled = useCallback(
    async (enabled: boolean) => {
      const nextSettings: ThemeSettings = {
        sleepWindow,
        autoInfraredEnabled: enabled,
      };

      if (settingsRepository) {
        await settingsRepository.saveThemeSettings(nextSettings);
      }

      applyThemeSettings(nextSettings);
    },
    [applyThemeSettings, settingsRepository, sleepWindow],
  );

  const themeName = new ThemeEngine(activeClock).resolveActiveTheme({
    sleepWindow,
    autoInfraredEnabled,
    manualThemeOverride,
  });

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName,
      sleepWindow,
      autoInfraredEnabled,
      manualThemeOverride,
      colors: THEME_PALETTES[themeName],
      setManualThemeOverride,
      setSleepWindow,
      setAutoInfraredEnabled,
      applyThemeSettings,
    }),
    [
      applyThemeSettings,
      autoInfraredEnabled,
      manualThemeOverride,
      setAutoInfraredEnabled,
      setSleepWindow,
      themeName,
      sleepWindow,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
