import { useAppProvider } from '../../composition';
import { ThemeProvider } from '../../theme';
import { InitializationErrorScreen, InitializingScreen } from '../bootstrap';
import { AppNavigation } from '../navigation';

export function AppShell() {
  const appProviderState = useAppProvider();

  if (appProviderState.status === 'ready') {
    const { clock, repositories } = appProviderState.compositionRoot;

    return (
      <ThemeProvider clock={clock} settingsRepository={repositories.themeSettingsRepository}>
        <AppNavigation />
      </ThemeProvider>
    );
  }

  if (appProviderState.status === 'initializing') {
    return (
      <ThemeProvider>
        <InitializingScreen />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <InitializationErrorScreen message={appProviderState.message} />
    </ThemeProvider>
  );
}
