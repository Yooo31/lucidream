import { StyleSheet, Text, View } from 'react-native';

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
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
});

export function InitializingScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Initializing...
      </Text>
      <Text style={styles.subtitle}>Preparing local storage and migrations.</Text>
    </View>
  );
}
