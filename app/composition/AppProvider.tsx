import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import {
  createCompositionRoot,
  type CompositionRoot,
  type CreateCompositionRoot,
} from './CompositionRoot';

interface AppProviderInitializingState {
  status: 'initializing';
}

interface AppProviderReadyState {
  status: 'ready';
  compositionRoot: CompositionRoot;
}

interface AppProviderErrorState {
  status: 'error';
  message: string;
}

export type AppProviderState =
  | AppProviderInitializingState
  | AppProviderReadyState
  | AppProviderErrorState;

interface AppProviderProps extends PropsWithChildren {
  createRoot?: CreateCompositionRoot;
}

const AppProviderContext = createContext<AppProviderState | null>(null);

function toUserSafeMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return 'Unable to initialize local data.';
}

export function AppProvider({ children, createRoot }: AppProviderProps) {
  const [state, setState] = useState<AppProviderState>({
    status: 'initializing',
  });

  useEffect(() => {
    let isMounted = true;
    const buildRoot = createRoot ?? createCompositionRoot;

    buildRoot()
      .then((compositionRoot) => {
        if (!isMounted) {
          return;
        }

        setState({
          status: 'ready',
          compositionRoot,
        });
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setState({
          status: 'error',
          message: toUserSafeMessage(error),
        });
      });

    return () => {
      isMounted = false;
    };
  }, [createRoot]);

  return <AppProviderContext.Provider value={state}>{children}</AppProviderContext.Provider>;
}

export function useAppProvider(): AppProviderState {
  const context = useContext(AppProviderContext);

  if (context === null) {
    throw new Error('useAppProvider must be used within AppProvider.');
  }

  return context;
}

export function useCompositionRoot(): CompositionRoot {
  const context = useAppProvider();

  if (context.status !== 'ready') {
    throw new Error('Composition root is not ready yet.');
  }

  return context.compositionRoot;
}
