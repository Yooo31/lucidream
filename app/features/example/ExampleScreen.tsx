import { Text, View, StyleSheet } from 'react-native';

import { useTheme } from '../../theme';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});

export function ExampleScreen() {
  const { colors } = useTheme();

  return (
    <View
      testID="example-screen-container"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text testID="example-screen-title" style={[styles.title, { color: colors.textPrimary }]}>
        LuciDream V1
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Offline-first mobile foundation
      </Text>
    </View>
  );
}
