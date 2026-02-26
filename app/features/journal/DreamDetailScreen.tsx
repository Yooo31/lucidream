import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useCompositionRoot } from '../../composition';
import type { Dream, DreamQuality, Tag, TagType } from '../../domain';
import { useTheme, type ThemePalette } from '../../theme';

interface DreamTagSearchReader {
  execute(input: { type: TagType; query: string }): Promise<{
    ok: boolean;
    tags?: readonly Tag[];
    decision?: {
      maxTagSearchResults: number | null;
    };
  }>;
}

interface DreamTagCreator {
  execute(input: { type: TagType; name: string }): Promise<{
    ok: boolean;
    tag?: Tag;
  }>;
}

interface DreamTagAssigner {
  execute(input: { dreamId: string; tagId: string }): Promise<{
    ok: boolean;
    dream?: Dream;
    code?: string;
  }>;
}

interface DreamTagReader {
  execute(input: { dreamId: string }): Promise<{
    ok: boolean;
    tags?: readonly Tag[];
  }>;
}

interface DreamAudioRecorderController {
  start(): Promise<{ ok: boolean }>;
  stopAndAttach(input: { dreamId: string }): Promise<{
    ok: boolean;
    dream?: Dream;
    audioPath?: string;
    code?: string;
  }>;
}

interface DreamAudioPlayerController {
  execute(input: { dreamId: string }): Promise<{
    ok: boolean;
    code?: string;
    decision?: {
      maxAudioPlaysLast7Days: number | null;
      maxAudioPlaysPerDay: number | null;
    };
  }>;
  stop(): Promise<void>;
}

const TAG_TYPE_OPTIONS: ReadonlyArray<{ type: TagType; label: string }> = [
  { type: 'CHARACTER', label: 'Character' },
  { type: 'LOCATION', label: 'Place' },
  { type: 'ACTION', label: 'Action' },
  { type: 'EMOTION', label: 'Emotion' },
];

const styles = StyleSheet.create({
  audioButton: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  audioButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
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
  errorText: {
    color: '#FF8B7A',
    fontSize: 13,
    marginTop: 8,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
  },
  infoText: {
    color: '#84D8FF',
    fontSize: 13,
    marginTop: 8,
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
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginTop: 10,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  searchLimitText: {
    fontSize: 12,
    marginTop: 6,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
  },
  suggestionButton: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagCreateButton: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  tagTypeButton: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    marginRight: 8,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tagTypeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tagTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  tagValue: {
    fontSize: 14,
    marginTop: 4,
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

function normalizeTagName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function toGroupedTagValue(tags: readonly Tag[], type: TagType): string {
  const names = tags
    .filter((tag) => tag.type === type)
    .map((tag) => tag.name)
    .sort((left, right) => left.localeCompare(right));

  if (names.length === 0) {
    return 'None';
  }

  return names.join(', ');
}

function toAudioPlaybackLimitMessage(decision: {
  maxAudioPlaysLast7Days: number | null;
  maxAudioPlaysPerDay: number | null;
}): string {
  if (decision.maxAudioPlaysPerDay !== null) {
    return `Playback limit reached (${decision.maxAudioPlaysPerDay} per day).`;
  }

  if (decision.maxAudioPlaysLast7Days !== null) {
    return `Playback limit reached (${decision.maxAudioPlaysLast7Days} per 7 days).`;
  }

  return 'Audio playback is currently unavailable.';
}

function toFileName(path: string): string {
  const normalizedPath = path.trim();
  const segments = normalizedPath.split('/');
  const fileName = segments[segments.length - 1];

  return fileName && fileName.length > 0 ? fileName : normalizedPath;
}

interface DreamDetailScreenViewProps {
  activeThemePalette: ThemePalette;
  dream: Dream;
  searchTagsUseCase: DreamTagSearchReader;
  createTagUseCase: DreamTagCreator;
  addTagToDreamUseCase: DreamTagAssigner;
  listDreamTagsUseCase: DreamTagReader;
  recordDreamAudioUseCase: DreamAudioRecorderController;
  playDreamAudioUseCase: DreamAudioPlayerController;
  onBack?: () => void;
}

export function DreamDetailScreenView({
  activeThemePalette,
  dream,
  searchTagsUseCase,
  createTagUseCase,
  addTagToDreamUseCase,
  listDreamTagsUseCase,
  recordDreamAudioUseCase,
  playDreamAudioUseCase,
  onBack,
}: DreamDetailScreenViewProps) {
  const [localDream, setLocalDream] = useState(dream);
  const [dreamTags, setDreamTags] = useState<readonly Tag[]>([]);
  const [selectedTagType, setSelectedTagType] = useState<TagType>('CHARACTER');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<readonly Tag[]>([]);
  const [searchLimitLabel, setSearchLimitLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioErrorMessage, setAudioErrorMessage] = useState<string | null>(null);
  const [audioStatusMessage, setAudioStatusMessage] = useState<string | null>(null);
  const [isAudioSubmitting, setIsAudioSubmitting] = useState(false);

  const lucidityScore = inferLucidityScore(localDream.quality);
  const normalizedSearchQuery = useMemo(() => normalizeTagName(searchQuery), [searchQuery]);

  useEffect(() => {
    setLocalDream(dream);
  }, [dream]);

  useEffect(
    () => () => {
      playDreamAudioUseCase.stop().catch(() => undefined);
    },
    [playDreamAudioUseCase],
  );

  useEffect(() => {
    let isMounted = true;

    listDreamTagsUseCase
      .execute({ dreamId: localDream.id })
      .then((result) => {
        if (!isMounted) {
          return;
        }

        if (!result.ok || result.tags === undefined) {
          setErrorMessage('Unable to load dream tags.');
          return;
        }

        setDreamTags(result.tags);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setErrorMessage('Unable to load dream tags.');
      });

    return () => {
      isMounted = false;
    };
  }, [listDreamTagsUseCase, localDream.id]);

  useEffect(() => {
    let isMounted = true;

    if (normalizedSearchQuery.length > 0) {
      searchTagsUseCase
        .execute({
          type: selectedTagType,
          query: normalizedSearchQuery,
        })
        .then((result) => {
          if (!isMounted) {
            return;
          }

          if (!result.ok || result.tags === undefined || result.decision === undefined) {
            setSearchResults([]);
            return;
          }

          setSearchResults(result.tags);

          if (result.decision.maxTagSearchResults === null) {
            setSearchLimitLabel(null);
            return;
          }

          setSearchLimitLabel(
            `Plan limit: up to ${result.decision.maxTagSearchResults} suggestions per search.`,
          );
        })
        .catch(() => {
          if (!isMounted) {
            return;
          }

          setSearchResults([]);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [normalizedSearchQuery, searchTagsUseCase, selectedTagType]);

  const availableSuggestions = useMemo(
    () =>
      normalizedSearchQuery.length === 0
        ? []
        : searchResults.filter((tag) => !localDream.tagIds.includes(tag.id)),
    [localDream.tagIds, normalizedSearchQuery.length, searchResults],
  );

  const canCreateTag = useMemo(() => {
    const normalizedQuery = normalizedSearchQuery.toLowerCase();

    if (normalizedQuery.length === 0) {
      return false;
    }

    const existingTags = [...dreamTags, ...searchResults];

    return !existingTags.some(
      (tag) =>
        tag.type === selectedTagType &&
        normalizeTagName(tag.name).toLowerCase() === normalizedQuery,
    );
  }, [dreamTags, normalizedSearchQuery, searchResults, selectedTagType]);

  const attachTagToDream = async (tag: Tag): Promise<boolean> => {
    const result = await addTagToDreamUseCase.execute({
      dreamId: localDream.id,
      tagId: tag.id,
    });

    if (!result.ok || result.dream === undefined) {
      setErrorMessage('Unable to attach tag to dream.');
      return false;
    }

    setLocalDream(result.dream);
    setDreamTags((current) => {
      if (current.some((currentTag) => currentTag.id === tag.id)) {
        return current;
      }

      return [...current, tag];
    });
    setStatusMessage(`Attached tag: ${tag.name}`);
    return true;
  };

  const handleAddExistingTag = async (tag: Tag) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await attachTagToDream(tag);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAndAttachTag = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const createResult = await createTagUseCase.execute({
        type: selectedTagType,
        name: searchQuery,
      });

      if (!createResult.ok || createResult.tag === undefined) {
        setErrorMessage('Unable to create tag.');
        return;
      }

      const attached = await attachTagToDream(createResult.tag);

      if (attached) {
        setSearchQuery('');
        setSearchResults([]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRecording = async () => {
    if (isAudioSubmitting) {
      return;
    }

    setIsAudioSubmitting(true);
    setAudioErrorMessage(null);
    setAudioStatusMessage(null);

    try {
      if (!isRecording) {
        const startResult = await recordDreamAudioUseCase.start();

        if (!startResult.ok) {
          setAudioErrorMessage('Unable to start recording.');
          return;
        }

        setIsRecording(true);
        setAudioStatusMessage('Recording in progress. Tap Stop to attach.');
        return;
      }

      const stopResult = await recordDreamAudioUseCase.stopAndAttach({
        dreamId: localDream.id,
      });

      setIsRecording(false);

      if (!stopResult.ok || stopResult.dream === undefined || stopResult.audioPath === undefined) {
        if (stopResult.code === 'DREAM_NOT_FOUND') {
          setAudioErrorMessage('Dream no longer exists.');
          return;
        }

        if (stopResult.code === 'AUDIO_SAVE_FAILED') {
          setAudioErrorMessage('Unable to save audio locally.');
          return;
        }

        if (stopResult.code === 'RECORDING_STOP_FAILED') {
          setAudioErrorMessage('Unable to stop recording.');
          return;
        }

        setAudioErrorMessage('Unable to attach recorded audio.');
        return;
      }

      setLocalDream(stopResult.dream);
      setAudioStatusMessage(`Attached audio: ${toFileName(stopResult.audioPath)}`);
    } finally {
      setIsAudioSubmitting(false);
    }
  };

  const handlePlayAudio = async () => {
    if (isAudioSubmitting || !localDream.audioPath) {
      return;
    }

    setIsAudioSubmitting(true);
    setAudioErrorMessage(null);
    setAudioStatusMessage(null);

    try {
      const result = await playDreamAudioUseCase.execute({
        dreamId: localDream.id,
      });

      if (!result.ok) {
        if (result.code === 'PLAYBACK_QUOTA_REACHED' && result.decision) {
          setAudioErrorMessage(toAudioPlaybackLimitMessage(result.decision));
          return;
        }

        if (result.code === 'AUDIO_NOT_AVAILABLE') {
          setAudioErrorMessage('No attached audio to play.');
          return;
        }

        setAudioErrorMessage('Unable to play attached audio.');
        return;
      }

      setAudioStatusMessage('Playback started.');
    } finally {
      setIsAudioSubmitting(false);
    }
  };

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
          {formatLocalDateTime(localDream.createdAt)}
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
          {localDream.quality}
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
          {toOptionalValue(localDream.title)}
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
          {toOptionalValue(localDream.content)}
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
        {TAG_TYPE_OPTIONS.map((option) => (
          <View key={option.type}>
            <Text style={[styles.sectionHeading, { color: activeThemePalette.textSecondary }]}>
              {option.label}
            </Text>
            <Text style={[styles.tagValue, { color: activeThemePalette.textPrimary }]}>
              {toGroupedTagValue(dreamTags, option.type)}
            </Text>
          </View>
        ))}
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
        <Text style={[styles.rowLabel, { color: activeThemePalette.textSecondary }]}>Add Tag</Text>
        <View style={styles.tagTypeRow}>
          {TAG_TYPE_OPTIONS.map((option) => {
            const isSelected = selectedTagType === option.type;

            return (
              <Pressable
                accessibilityRole="button"
                key={option.type}
                onPress={() => setSelectedTagType(option.type)}
                style={[
                  styles.tagTypeButton,
                  {
                    borderColor: activeThemePalette.textSecondary,
                    backgroundColor: isSelected ? '#1A1A1A' : '#0D0D0D',
                  },
                ]}
                testID={`dream-detail-tag-type-${option.type}`}
              >
                <Text style={[styles.tagTypeButtonText, { color: activeThemePalette.textPrimary }]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          accessibilityLabel="Search tags"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearchQuery}
          placeholder="Search or create tag"
          placeholderTextColor={activeThemePalette.textSecondary}
          style={[
            styles.searchInput,
            {
              borderColor: activeThemePalette.textSecondary,
              color: activeThemePalette.textPrimary,
              backgroundColor: '#050505',
            },
          ]}
          testID="dream-detail-tag-search-input"
          value={searchQuery}
        />

        {normalizedSearchQuery.length > 0 && searchLimitLabel ? (
          <Text style={[styles.searchLimitText, { color: activeThemePalette.textSecondary }]}>
            {searchLimitLabel}
          </Text>
        ) : null}

        {availableSuggestions.map((tag) => (
          <Pressable
            accessibilityRole="button"
            key={tag.id}
            onPress={() => {
              handleAddExistingTag(tag).catch(() => undefined);
            }}
            style={[
              styles.suggestionButton,
              {
                borderColor: activeThemePalette.textSecondary,
                backgroundColor: '#111111',
              },
            ]}
            testID={`dream-detail-tag-suggestion-${tag.id}`}
          >
            <Text style={[styles.suggestionText, { color: activeThemePalette.textPrimary }]}>
              {tag.name}
            </Text>
          </Pressable>
        ))}

        {canCreateTag ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              handleCreateAndAttachTag().catch(() => undefined);
            }}
            style={[
              styles.tagCreateButton,
              {
                borderColor: activeThemePalette.textSecondary,
                backgroundColor: '#141414',
              },
            ]}
            testID="dream-detail-tag-create-button"
          >
            <Text style={[styles.suggestionText, { color: activeThemePalette.textPrimary }]}>
              Create & attach &quot;{normalizeTagName(searchQuery)}&quot;
            </Text>
          </Pressable>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {statusMessage ? <Text style={styles.infoText}>{statusMessage}</Text> : null}
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
        <Text style={[styles.rowLabel, { color: activeThemePalette.textSecondary }]}>Audio</Text>
        {localDream.audioPath ? (
          <Text
            style={[styles.rowValue, { color: activeThemePalette.textPrimary }]}
            testID="dream-detail-audio-item"
          >
            {toFileName(localDream.audioPath)}
          </Text>
        ) : (
          <Text style={[styles.rowValue, { color: activeThemePalette.textPrimary }]}>
            No attached audio.
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            handleToggleRecording().catch(() => undefined);
          }}
          style={[
            styles.audioButton,
            {
              borderColor: activeThemePalette.textSecondary,
              backgroundColor: '#141414',
            },
          ]}
          testID="dream-detail-audio-record-toggle"
        >
          <Text style={[styles.audioButtonText, { color: activeThemePalette.textPrimary }]}>
            {isRecording ? 'Stop' : 'Record'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            handlePlayAudio().catch(() => undefined);
          }}
          style={[
            styles.audioButton,
            {
              borderColor: activeThemePalette.textSecondary,
              backgroundColor: localDream.audioPath ? '#121212' : '#0F0F0F',
              opacity: localDream.audioPath ? 1 : 0.55,
            },
          ]}
          testID="dream-detail-audio-play-button"
        >
          <Text style={[styles.audioButtonText, { color: activeThemePalette.textPrimary }]}>
            Play attached audio
          </Text>
        </Pressable>
        {audioErrorMessage ? <Text style={styles.errorText}>{audioErrorMessage}</Text> : null}
        {audioStatusMessage ? <Text style={styles.infoText}>{audioStatusMessage}</Text> : null}
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
          {toOptionalValue(localDream.drawingPath)}
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
        <Text style={[styles.rowValue, { color: activeThemePalette.textPrimary }]}>
          {localDream.id}
        </Text>
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
  const { useCases } = useCompositionRoot();
  const optionalProps =
    onBack === undefined
      ? {}
      : ({
          onBack,
        } satisfies Pick<DreamDetailScreenViewProps, 'onBack'>);

  return (
    <DreamDetailScreenView
      activeThemePalette={colors}
      dream={dream}
      searchTagsUseCase={useCases.searchTagsUseCase}
      createTagUseCase={useCases.createTagUseCase}
      addTagToDreamUseCase={useCases.addTagToDreamUseCase}
      listDreamTagsUseCase={useCases.listDreamTagsUseCase}
      recordDreamAudioUseCase={useCases.recordDreamAudioUseCase}
      playDreamAudioUseCase={useCases.playDreamAudioUseCase}
      {...optionalProps}
    />
  );
}
