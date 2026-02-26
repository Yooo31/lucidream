import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';

import { ExampleScreen } from './app/features/example/ExampleScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <ExampleScreen />
      <StatusBar />
    </SafeAreaView>
  );
}
