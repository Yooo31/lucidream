import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Dream, DreamQuality } from '../../domain';
import { useTheme, type ThemePalette } from '../../theme';

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    backgroundColor: '#050505',
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
  },
  row: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  rowValue: {
    fontSize: 15,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
  },
});

function formatLocalDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function inferLucidityScore(quality: DreamQuality): number {
  if (quality === 'LUCID') {
    return 90;
  }

  if (quality === 'VIVID') {
    return 70;
  }

  if (quality === 'CLEAR') {
    return 45;
  }

  return 20;
}

function toOptionalValue(value: string | undefined): string {
  if (value === undefined || value.trim().length === 0) {
    return 'Not set';
  }

  return value.trim();
}

function toTagValue(tagIds: readonly string[]): string {
  if (tagIds.length === 0) {
    return 'No tags';
  }

  return tagIds.join(', ');
}

interface DreamDetailScreenViewProps {
  activeThemePalette: ThemePalette;
  dream: Dream;
  onBack?: () => void;
}

export function DreamDetailScreenView({
  activeThemePalette,
  dream,
  onBack,
}: DreamDetailScreenViewProps) {
  const lucidityScore = inferLucidityScore(dream.quality);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: activeThemePalette.background }]}
      style={{ backgroundColor: activeThemePalette.background }}
    >
      <Text
        accessibilityRole="header"
        style={[styles.header, { color: activeThemePalette.textPrimary }]}
      >
        Dream Detail
      </Text>
      <Text style={[styles.subtitle, { color: activeThemePalette.textSecondary }]}>
        Stored locally on device.
      </Text>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={[
            styles.backButton,
            {
              borderColor: activeThemePalette.textSecondary,
              backgroundColor: '#0D0D0D',
            },
          ]}
          testID="dream-detail-back-button"
        >
          <Text style={[styles.backButtonText, { color: activeThemePalette.textPrimary }]}>
            Back
          </Text>
        </Pressable>
      ) : null}

      <View
        style={[
          styles.row,
          {
            borderColor: activeThemePalette.textSecondary,
            backgroundColor: '#0D0D0D',
          },
        ]}
      >
        <Text style={[styles.rowLabel, { color: activeThemePalette.textSecondary }]}>Date</Text>
        <Text style={[styles.rowValue, { color: activeThemePalette.textPrimary }]}>
          {formatLocalDateTime(dream.createdAt)}
        </Text>
      </View>

      <View
        style={[
          styles.row,
          {
            borderColor: activeThemePalette.textSecondary,
            backgroundColor: '#0D0D0D',
          },
        ]}
      >
        <Text style={[styles.rowLabel, { color: activeThemePalette.textSecondary }]}>Quality</Text>
        <Text style={[styles.rowValue, { color: activeThemePalette.textPrimary }]}>
          {dream.quality}
        </Text>
      </View>

      <View
        style={[
          styles.row,
          {
            borderColor: activeThemePalette.textSecondary,
            backgroundColor: '#0D0D0D',
          },
        ]}
      >
        <Text style={[styles.rowLabel, { color: activeThemePalette.textSecondary }]}>Lucidity</Text>
        <Text style={[styles.rowValue, { color: activeThemePalette.textPrimary }]}>
          {lucidityScore}/100 (inferred from quality)
        </Text>
      </View>

      <View
        style={[
          styles.row,
          {
            borderColor: activeThemePalette.textSecondary,
            backgroundColor: '#0D0D0D',
          },
        ]}
      >
        <Text style={[styles.rowLabel, { color: activeThemePalette.textSecondary }]}>Title</Text>
        <Text style={[styles.rowValue, { color: activeThemePalette.textPrimary }]}>
          {toOptionalValue(dream.title)}
        </Text>
      </View>

      <View
        style={[
          styles.row,
          {
            borderColor: activeThemePalette.textSecondary,
            backgroundColor: '#0D0D0D',
          },
        ]}
      >
        <Text style={[styles.rowLabel, { color: activeThemePalette.textSecondary }]}>Story</Text>
        <Text style={[styles.rowValue, { color: activeThemePalette.textPrimary }]}>
          {toOptionalValue(dream.content)}
        </Text>
      </View>

      <View
        style={[
          styles.row,
          {
            borderColor: activeThemePalette.textSecondary,
            backgroundColor: '#0D0D0D',
          },
        ]}
      >
        <Text style={[styles.rowLabel, { color: activeThemePalette.textSecondary }]}>Tags</Text>
        <Text style={[styles.rowValue, { color: activeThemePalette.textPrimary }]}>
          {toTagValue(dream.tagIds)}
        </Text>
      </View>

      <View
        style={[
          styles.row,
          {
            borderColor: activeThemePalette.textSecondary,
            backgroundColor: '#0D0D0D',
          },
        ]}
      >
        <Text style={[styles.rowLabel, { color: activeThemePalette.textSecondary }]}>
          Audio Path
        </Text>
        <Text style={[styles.rowValue, { color: activeThemePalette.textPrimary }]}>
          {toOptionalValue(dream.audioPath)}
        </Text>
      </View>

      <View
        style={[
          styles.row,
          {
            borderColor: activeThemePalette.textSecondary,
            backgroundColor: '#0D0D0D',
          },
        ]}
      >
        <Text style={[styles.rowLabel, { color: activeThemePalette.textSecondary }]}>
          Drawing Path
        </Text>
        <Text style={[styles.rowValue, { color: activeThemePalette.textPrimary }]}>
          {toOptionalValue(dream.drawingPath)}
        </Text>
      </View>

      <View
        style={[
          styles.row,
          {
            borderColor: activeThemePalette.textSecondary,
            backgroundColor: '#0D0D0D',
          },
        ]}
      >
        <Text style={[styles.rowLabel, { color: activeThemePalette.textSecondary }]}>Dream ID</Text>
        <Text style={[styles.rowValue, { color: activeThemePalette.textPrimary }]}>{dream.id}</Text>
      </View>
    </ScrollView>
  );
}

interface DreamDetailScreenProps {
  dream: Dream;
  onBack?: () => void;
}

export function DreamDetailScreen({ dream, onBack }: DreamDetailScreenProps) {
  const { colors } = useTheme();
  const optionalProps =
    onBack === undefined
      ? {}
      : ({
          onBack,
        } satisfies Pick<DreamDetailScreenViewProps, 'onBack'>);

  return <DreamDetailScreenView activeThemePalette={colors} dream={dream} {...optionalProps} />;
}
