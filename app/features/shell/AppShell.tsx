import { useAppProvider } from '../../composition';
import { InitializationErrorScreen, InitializingScreen } from '../bootstrap';
import { AppNavigation } from '../navigation';

export function AppShell() {
  const appProviderState = useAppProvider();

  if (appProviderState.status === 'initializing') {
    return <InitializingScreen />;
  }

  if (appProviderState.status === 'error') {
    return <InitializationErrorScreen message={appProviderState.message} />;
  }

  return <AppNavigation />;
}
