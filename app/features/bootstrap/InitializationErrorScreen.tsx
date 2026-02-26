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
  message: {
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

interface InitializationErrorScreenProps {
  message: string;
}

export function InitializationErrorScreen({ message }: InitializationErrorScreenProps) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Initialization failed
      </Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
