import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
});

export function InitializingScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
        Initializing...
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Preparing local storage and migrations.
      </Text>
    </View>
  );
}
