import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider } from './app/composition';
import { AppShell } from './app/features/shell';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar />
      <AppProvider>
        <AppShell />
      </AppProvider>
    </SafeAreaProvider>
  );
}
