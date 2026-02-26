import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../../theme';

type PediaPageId = 'index' | 'wild' | 'mild' | 'ssild';

interface PediaPage {
  id: PediaPageId;
  label: string;
  title: string;
  subtitle: string;
  content: readonly string[];
}

const HEADING_FONT_FAMILY =
  Platform.select({
    android: 'serif',
    default: 'serif',
    ios: 'Georgia',
  }) ?? 'serif';

const BODY_FONT_FAMILY =
  Platform.select({
    android: 'sans-serif',
    default: 'serif',
    ios: 'Palatino',
  }) ?? 'serif';

const INDEX_PAGE: PediaPage = {
  id: 'index',
  label: 'Index',
  title: 'Oniri-Pedia Index',
  subtitle: 'Offline reference for lucid dreaming techniques.',
  content: [
    'WILD keeps awareness while the body falls asleep. It is direct and intense, but demands stable focus.',
    'MILD uses memory and intention. You repeat a clear phrase and visualize becoming lucid in a recent dream.',
    'SSILD rotates attention through sight, hearing, and body sensations in short cycles before sleep or after WBTB.',
    'Use this index to compare methods and pick the one matching your nightly energy level.',
  ],
};

const ONIRI_PEDIA_PAGES: readonly PediaPage[] = [
  INDEX_PAGE,
  {
    id: 'wild',
    label: 'WILD',
    title: 'WILD: Wake Initiated Lucid Dream',
    subtitle: 'Enter a dream directly from waking awareness.',
    content: [
      'Start during a calm return-to-sleep window, usually after a short wake period in the night.',
      'Relax the body progressively while keeping a light, stable anchor like breath counting or gentle imagery.',
      'When hypnagogic sensations grow, stay observational. Avoid forcing movement until the dream scene stabilizes.',
      'WILD works best with patience and a neutral mindset. Chasing sensations too hard usually breaks the transition.',
    ],
  },
  {
    id: 'mild',
    label: 'MILD',
    title: 'MILD: Mnemonic Induced Lucid Dream',
    subtitle: 'Use memory and intention to trigger lucidity later.',
    content: [
      'Recall a recent dream and pick a moment where lucidity would have changed your choices.',
      'Repeat a short phrase such as: "Next time I am dreaming, I will notice I am dreaming."',
      'Visualize the same scene with your new lucid response while keeping the phrase active and believable.',
      'MILD is low-friction and pairs well with dream journaling because recall quality amplifies the cue.',
    ],
  },
  {
    id: 'ssild',
    label: 'SSILD',
    title: 'SSILD: Senses Initiated Lucid Dream',
    subtitle: 'Cycle attention through senses to prime awareness.',
    content: [
      'After waking briefly at night, return to bed and run short cycles of visual, auditory, and body attention.',
      'Keep each short cycle light, roughly a few seconds per sense, then do several longer cycles without strain.',
      'The goal is soft awareness, not concentration pressure. Drowsiness is expected and usually helpful.',
      'SSILD is forgiving and often combines well with MILD by adding one intention phrase before sleep.',
    ],
  },
];

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipLabel: {
    fontFamily: BODY_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  contentParagraph: {
    fontFamily: BODY_FONT_FAMILY,
    fontSize: 16,
    letterSpacing: 0.2,
    lineHeight: 26,
    marginTop: 12,
  },
  header: {
    fontFamily: HEADING_FONT_FAMILY,
    fontSize: 31,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  noResults: {
    fontFamily: BODY_FONT_FAMILY,
    fontSize: 14,
    marginTop: 10,
  },
  pageHeader: {
    fontFamily: HEADING_FONT_FAMILY,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.7,
    lineHeight: 30,
    marginTop: 18,
  },
  pageSubtitle: {
    fontFamily: BODY_FONT_FAMILY,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  resultButton: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultDescription: {
    fontFamily: BODY_FONT_FAMILY,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  resultLabel: {
    fontFamily: BODY_FONT_FAMILY,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontFamily: BODY_FONT_FAMILY,
    fontSize: 16,
    marginTop: 12,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  subtitle: {
    fontFamily: BODY_FONT_FAMILY,
    fontSize: 14,
    letterSpacing: 0.2,
    lineHeight: 20,
    marginTop: 6,
  },
  topSection: {
    paddingBottom: 12,
  },
});

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function resolveSurfaceColor(themeName: 'dark' | 'infrared'): string {
  if (themeName === 'infrared') {
    return '#140000';
  }

  return '#0F0F0F';
}

function resolveActiveChipColor(themeName: 'dark' | 'infrared'): string {
  if (themeName === 'infrared') {
    return '#2A0400';
  }

  return '#181818';
}

export function OniriPediaScreen() {
  const { colors, themeName } = useTheme();
  const [activePageId, setActivePageId] = useState<PediaPageId>('index');
  const [searchQuery, setSearchQuery] = useState('');

  const activePage = useMemo(
    () => ONIRI_PEDIA_PAGES.find((page) => page.id === activePageId) ?? INDEX_PAGE,
    [activePageId],
  );
  const normalizedQuery = normalize(searchQuery);

  const searchResults = useMemo(() => {
    if (normalizedQuery.length === 0) {
      return [];
    }

    return ONIRI_PEDIA_PAGES.filter((page) => {
      const haystack = normalize(
        [page.label, page.title, page.subtitle, ...page.content].join(' '),
      );
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  const surfaceColor = resolveSurfaceColor(themeName);
  const activeChipColor = resolveActiveChipColor(themeName);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 28 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topSection}>
        <Text accessibilityRole="header" style={[styles.header, { color: colors.textPrimary }]}>
          Oniri-Pedia
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Local dream method pages built for low-light reading.
        </Text>
        <TextInput
          accessibilityLabel="Search Oniri-Pedia"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearchQuery}
          placeholder="Search WILD, MILD, SSILD..."
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.searchInput,
            {
              borderColor: colors.textSecondary,
              color: colors.textPrimary,
              backgroundColor: surfaceColor,
            },
          ]}
          testID="oniri-pedia-search-input"
          value={searchQuery}
        />
        {normalizedQuery.length > 0 && searchResults.length === 0 ? (
          <Text
            style={[styles.noResults, { color: colors.textSecondary }]}
            testID="oniri-pedia-no-results"
          >
            No page matches that search.
          </Text>
        ) : null}
        {searchResults.map((page) => (
          <Pressable
            accessibilityRole="button"
            key={page.id}
            onPress={() => {
              setActivePageId(page.id);
              setSearchQuery('');
            }}
            style={[
              styles.resultButton,
              {
                borderColor: colors.textSecondary,
                backgroundColor: surfaceColor,
              },
            ]}
            testID={`oniri-pedia-search-result-${page.id}`}
          >
            <Text style={[styles.resultLabel, { color: colors.textPrimary }]}>{page.label}</Text>
            <Text
              numberOfLines={2}
              style={[styles.resultDescription, { color: colors.textSecondary }]}
            >
              {page.subtitle}
            </Text>
          </Pressable>
        ))}
        <View style={styles.chipRow}>
          {ONIRI_PEDIA_PAGES.map((page) => {
            const isActive = page.id === activePage.id;
            return (
              <Pressable
                accessibilityRole="button"
                key={page.id}
                onPress={() => setActivePageId(page.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: colors.textSecondary,
                    backgroundColor: isActive ? activeChipColor : surfaceColor,
                  },
                ]}
                testID={`oniri-pedia-nav-${page.id}`}
              >
                <Text style={[styles.chipLabel, { color: colors.textPrimary }]}>{page.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text
        accessibilityRole="header"
        style={[styles.pageHeader, { color: colors.textPrimary }]}
        testID="oniri-pedia-page-title"
      >
        {activePage.title}
      </Text>
      <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
        {activePage.subtitle}
      </Text>
      {activePage.content.map((paragraph, index) => (
        <Text
          key={`${activePage.id}-${index.toString()}`}
          style={[styles.contentParagraph, { color: colors.textPrimary }]}
        >
          {paragraph}
        </Text>
      ))}
    </ScrollView>
  );
}
