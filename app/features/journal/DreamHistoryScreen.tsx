import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCompositionRoot } from '../../composition';
import type { Dream } from '../../domain';
import { useTheme, type ThemePalette } from '../../theme';
import type { ListDreamsInput, ListDreamsResult } from '../../services';

interface DreamHistoryReader {
  execute(input?: ListDreamsInput): Promise<ListDreamsResult>;
}

interface DreamHistoryScreenViewProps {
  activeThemePalette: ThemePalette;
  listDreamsUseCase: DreamHistoryReader;
  onOpenDream: (dream: Dream) => void;
  onBack?: () => void;
}

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
  emptyMessage: {
    fontSize: 14,
    marginTop: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
  },
  item: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  itemMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemValue: {
    fontSize: 14,
    marginTop: 8,
  },
  limitLabel: {
    fontSize: 14,
    fontWeight: '600',
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

function summarizeContent(content: string | undefined): string {
  if (content === undefined || content.trim().length === 0) {
    return 'No story saved.';
  }

  const trimmed = content.trim();

  if (trimmed.length <= 90) {
    return trimmed;
  }

  return `${trimmed.slice(0, 90)}...`;
}

function formatHistoryLimitLabel(maxHistoryDays: number | null): string {
  if (maxHistoryDays === null) {
    return 'Unlimited history';
  }

  return `Limited to last ${maxHistoryDays} days`;
}

function sortByCreatedAtDesc(dreams: readonly Dream[]): readonly Dream[] {
  return [...dreams].sort((left, right) => right.createdAt - left.createdAt);
}

export function DreamHistoryScreenView({
  activeThemePalette,
  listDreamsUseCase,
  onOpenDream,
  onBack,
}: DreamHistoryScreenViewProps) {
  const [dreams, setDreams] = useState<readonly Dream[]>([]);
  const [historyLimitLabel, setHistoryLimitLabel] = useState<string>('Loading history limits...');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    listDreamsUseCase
      .execute()
      .then((result) => {
        if (!isMounted) {
          return;
        }

        if (!result.ok) {
          setErrorMessage('Unable to load dream history right now.');
          setIsLoading(false);
          return;
        }

        setHistoryLimitLabel(formatHistoryLimitLabel(result.decision.maxHistoryDays));
        setDreams(result.dreams);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setErrorMessage('Unable to load dream history right now.');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [listDreamsUseCase]);

  const sortedDreams = useMemo(() => sortByCreatedAtDesc(dreams), [dreams]);

  return (
    <View style={[styles.container, { backgroundColor: activeThemePalette.background }]}>
      <Text
        accessibilityRole="header"
        style={[styles.header, { color: activeThemePalette.textPrimary }]}
      >
        Dream History
      </Text>
      <Text style={[styles.subtitle, { color: activeThemePalette.textSecondary }]}>
        Local-only timeline of your saved dreams.
      </Text>
      <Text
        style={[styles.limitLabel, { color: activeThemePalette.textPrimary }]}
        testID="dream-history-limit-label"
      >
        {historyLimitLabel}
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
          testID="dream-history-back-button"
        >
          <Text style={[styles.backButtonText, { color: activeThemePalette.textPrimary }]}>
            Back
          </Text>
        </Pressable>
      ) : null}
      {isLoading ? (
        <Text
          style={[styles.emptyMessage, { color: activeThemePalette.textSecondary }]}
          testID="dream-history-loading"
        >
          Loading dreams...
        </Text>
      ) : null}
      {errorMessage ? (
        <Text style={[styles.emptyMessage, { color: '#FF8B7A' }]} testID="dream-history-error">
          {errorMessage}
        </Text>
      ) : null}
      {!isLoading && !errorMessage ? (
        <FlatList
          data={sortedDreams}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text
              style={[styles.emptyMessage, { color: activeThemePalette.textSecondary }]}
              testID="dream-history-empty"
            >
              No dreams in your available history window.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenDream(item)}
              style={[
                styles.item,
                {
                  borderColor: activeThemePalette.textSecondary,
                  backgroundColor: '#0D0D0D',
                },
              ]}
              testID={`dream-history-item-${item.id}`}
            >
              <Text style={[styles.itemTitle, { color: activeThemePalette.textPrimary }]}>
                {item.title ?? 'Untitled dream'}
              </Text>
              <Text style={[styles.itemMeta, { color: activeThemePalette.textSecondary }]}>
                {formatLocalDateTime(item.createdAt)} • {item.quality}
              </Text>
              <Text style={[styles.itemValue, { color: activeThemePalette.textPrimary }]}>
                {summarizeContent(item.content)}
              </Text>
            </Pressable>
          )}
          testID="dream-history-list"
        />
      ) : null}
    </View>
  );
}

interface DreamHistoryScreenProps {
  onOpenDream: (dream: Dream) => void;
  onBack?: () => void;
}

export function DreamHistoryScreen({ onOpenDream, onBack }: DreamHistoryScreenProps) {
  const { useCases } = useCompositionRoot();
  const { colors } = useTheme();
  const optionalProps =
    onBack === undefined
      ? {}
      : ({
          onBack,
        } satisfies Pick<DreamHistoryScreenViewProps, 'onBack'>);

  return (
    <DreamHistoryScreenView
      activeThemePalette={colors}
      listDreamsUseCase={useCases.listDreamsUseCase}
      onOpenDream={onOpenDream}
      {...optionalProps}
    />
  );
}
