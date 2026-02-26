import { Text, View, StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
});

export function ExampleScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LuciDream V1</Text>
      <Text style={styles.subtitle}>Offline-first mobile foundation</Text>
    </View>
  );
}
