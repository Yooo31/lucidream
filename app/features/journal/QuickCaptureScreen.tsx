import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';

import { useCompositionRoot } from '../../composition';
import type { DreamQuality } from '../../domain';
import { useTheme, type ThemePalette } from '../../theme';
import type {
  CreateDreamInput,
  CreateDreamResult,
  ListDreamsInput,
  ListDreamsResult,
} from '../../services';

interface DreamCreator {
  execute(input: CreateDreamInput): Promise<CreateDreamResult>;
}

interface DreamGateReader {
  execute(input?: ListDreamsInput): Promise<ListDreamsResult>;
}

type CaptureQuality = 'TOP' | 'NEUTRAL' | 'NIGHTMARE';

interface QuickCaptureScreenViewProps {
  activeThemePalette: ThemePalette;
  createDreamUseCase: DreamCreator;
  listDreamsUseCase: DreamGateReader;
  now: () => number;
}

const QUALITY_OPTIONS: ReadonlyArray<{ value: CaptureQuality; label: string }> = [
  { value: 'TOP', label: 'Top' },
  { value: 'NEUTRAL', label: 'Neutral' },
  { value: 'NIGHTMARE', label: 'Nightmare' },
];

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#050505',
    flex: 1,
    padding: 16,
  },
  dateInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 18,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  field: {
    marginTop: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  footerMessage: {
    fontSize: 14,
    marginTop: 12,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
  },
  lucidityTrack: {
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    marginTop: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  lucidityTrackFill: {
    borderRadius: 16,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  lucidityTrackValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    zIndex: 1,
  },
  qualityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  qualityOption: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  qualityOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  storyInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 17,
    minHeight: 180,
    paddingHorizontal: 14,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
  },
  titleInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 18,
    minHeight: 54,
    paddingHorizontal: 14,
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

function parseLocalDateTime(value: string): number | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})\s([01]\d|2[0-3]):([0-5]\d)$/);

  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1] ?? '', 10);
  const month = Number.parseInt(match[2] ?? '', 10);
  const day = Number.parseInt(match[3] ?? '', 10);
  const hour = Number.parseInt(match[4] ?? '', 10);
  const minute = Number.parseInt(match[5] ?? '', 10);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hour ||
    parsed.getMinutes() !== minute
  ) {
    return null;
  }

  return parsed.getTime();
}

function normalizeOptionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function mapCaptureToDreamQuality(
  captureQuality: CaptureQuality,
  lucidityScore: number,
): DreamQuality {
  if (lucidityScore >= 80) {
    return 'LUCID';
  }

  if (captureQuality === 'TOP') {
    return lucidityScore >= 55 ? 'VIVID' : 'CLEAR';
  }

  if (captureQuality === 'NIGHTMARE') {
    return 'VAGUE';
  }

  return lucidityScore >= 40 ? 'CLEAR' : 'VAGUE';
}

function formatQuotaMessage(maxDreamsPerDay: number | null): string {
  if (maxDreamsPerDay === null) {
    return 'Local quota currently blocks dream creation.';
  }

  return `Dream quota reached (${maxDreamsPerDay} per day). Try again tomorrow.`;
}

export function QuickCaptureScreenView({
  activeThemePalette,
  createDreamUseCase,
  listDreamsUseCase,
  now,
}: QuickCaptureScreenViewProps) {
  const [title, setTitle] = useState('');
  const [dateValue, setDateValue] = useState<string>(formatLocalDateTime(now()));
  const [story, setStory] = useState('');
  const [lucidity, setLucidity] = useState(50);
  const [captureQuality, setCaptureQuality] = useState<CaptureQuality>('NEUTRAL');
  const [trackWidth, setTrackWidth] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isGateBlocked, setIsGateBlocked] = useState(false);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    listDreamsUseCase
      .execute({ limit: 0 })
      .then((result) => {
        if (!isMounted || !result.ok) {
          return;
        }

        if (!result.decision.canCreateDream) {
          setIsGateBlocked(true);
          setGateMessage(formatQuotaMessage(result.decision.maxDreamsPerDay));
          return;
        }

        setIsGateBlocked(false);
        setGateMessage(null);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setIsGateBlocked(false);
      });

    return () => {
      isMounted = false;
    };
  }, [listDreamsUseCase]);

  const resolvedDreamQuality = useMemo(
    () => mapCaptureToDreamQuality(captureQuality, lucidity),
    [captureQuality, lucidity],
  );

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(Math.max(1, event.nativeEvent.layout.width));
  };

  const setLucidityFromTouch = (event: GestureResponderEvent) => {
    const x = Math.max(0, Math.min(trackWidth, event.nativeEvent.locationX));
    const nextValue = Math.round((x / trackWidth) * 100);
    setLucidity(nextValue);
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    if (isGateBlocked) {
      setErrorMessage(gateMessage ?? 'Dream quota reached. Try again tomorrow.');
      return;
    }

    const createdAt = parseLocalDateTime(dateValue);

    if (createdAt === null) {
      setErrorMessage('Date must use YYYY-MM-DD HH:MM format.');
      return;
    }

    const normalizedStory = normalizeOptionalText(story);

    if (normalizedStory === undefined) {
      setErrorMessage('Story is required.');
      return;
    }

    setIsSaving(true);

    try {
      const createInput: CreateDreamInput = {
        createdAt,
        quality: resolvedDreamQuality,
        content: normalizedStory,
      };
      const normalizedTitle = normalizeOptionalText(title);

      if (normalizedTitle !== undefined) {
        createInput.title = normalizedTitle;
      }

      const result = await createDreamUseCase.execute(createInput);

      if (!result.ok) {
        if (result.code === 'DREAM_QUOTA_REACHED') {
          const message = formatQuotaMessage(result.decision.maxDreamsPerDay);
          setIsGateBlocked(true);
          setGateMessage(message);
          setErrorMessage(message);
          return;
        }

        setErrorMessage('Unable to save this dream locally. Check inputs and try again.');
        return;
      }

      setStory('');
      setSuccessMessage('Dream saved locally.');
    } catch {
      setErrorMessage('Unable to save this dream locally.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: activeThemePalette.background }]}>
      <Text
        accessibilityRole="header"
        style={[styles.header, { color: activeThemePalette.textPrimary }]}
      >
        Quick Capture
      </Text>
      <Text style={[styles.subtitle, { color: activeThemePalette.textSecondary }]}>
        Fast wake-up capture with local-only save.
      </Text>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: activeThemePalette.textPrimary }]}>Title</Text>
        <TextInput
          accessibilityLabel="Dream title"
          onChangeText={setTitle}
          placeholder="Optional title"
          placeholderTextColor={activeThemePalette.textSecondary}
          style={[
            styles.titleInput,
            {
              borderColor: activeThemePalette.textSecondary,
              color: activeThemePalette.textPrimary,
            },
          ]}
          testID="quick-capture-title-input"
          value={title}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: activeThemePalette.textPrimary }]}>Date</Text>
        <TextInput
          accessibilityLabel="Dream date"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
          onChangeText={setDateValue}
          placeholder="2026-02-26 05:40"
          placeholderTextColor={activeThemePalette.textSecondary}
          style={[
            styles.dateInput,
            {
              borderColor: activeThemePalette.textSecondary,
              color: activeThemePalette.textPrimary,
            },
          ]}
          testID="quick-capture-date-input"
          value={dateValue}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: activeThemePalette.textPrimary }]}>Story</Text>
        <TextInput
          accessibilityLabel="Dream story"
          autoFocus
          multiline
          onChangeText={setStory}
          placeholder="What happened in your dream?"
          placeholderTextColor={activeThemePalette.textSecondary}
          style={[
            styles.storyInput,
            {
              borderColor: activeThemePalette.textSecondary,
              color: activeThemePalette.textPrimary,
            },
          ]}
          testID="quick-capture-story-input"
          value={story}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: activeThemePalette.textPrimary }]}>
          Lucidity slider ({lucidity}/100)
        </Text>
        <Pressable
          accessibilityLabel="Lucidity slider"
          accessibilityRole="adjustable"
          onLayout={handleTrackLayout}
          onPress={setLucidityFromTouch}
          style={[
            styles.lucidityTrack,
            {
              borderColor: activeThemePalette.textSecondary,
              backgroundColor: '#101010',
            },
          ]}
          testID="quick-capture-lucidity-track"
        >
          <View
            style={[
              styles.lucidityTrackFill,
              { backgroundColor: activeThemePalette.textPrimary, width: `${lucidity}%` },
            ]}
          />
          <Text style={[styles.lucidityTrackValue, { color: activeThemePalette.background }]}>
            {lucidity}
          </Text>
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: activeThemePalette.textPrimary }]}>Quality</Text>
        <View style={styles.qualityButtons}>
          {QUALITY_OPTIONS.map((option, index) => {
            const isActive = captureQuality === option.value;
            return (
              <Pressable
                accessibilityLabel={`Quality ${option.label}`}
                accessibilityRole="button"
                key={option.value}
                onPress={() => setCaptureQuality(option.value)}
                style={[
                  styles.qualityOption,
                  {
                    marginLeft: index === 0 ? 0 : 6,
                    marginRight: index === QUALITY_OPTIONS.length - 1 ? 0 : 6,
                    borderColor: activeThemePalette.textSecondary,
                    backgroundColor: isActive ? activeThemePalette.textPrimary : '#0D0D0D',
                  },
                ]}
                testID={`quick-capture-quality-${option.value.toLowerCase()}-button`}
              >
                <Text
                  style={[
                    styles.qualityOptionLabel,
                    {
                      color: isActive
                        ? activeThemePalette.background
                        : activeThemePalette.textPrimary,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={isSaving || isGateBlocked}
        onPress={handleSave}
        style={[
          styles.saveButton,
          {
            opacity: isSaving || isGateBlocked ? 0.6 : 1,
            backgroundColor: activeThemePalette.textPrimary,
          },
        ]}
        testID="quick-capture-save-button"
      >
        <Text style={[styles.saveButtonText, { color: activeThemePalette.background }]}>
          {isSaving ? 'Saving...' : 'Save dream'}
        </Text>
      </Pressable>

      <Text style={[styles.footerMessage, { color: activeThemePalette.textSecondary }]}>
        Mapped quality: {resolvedDreamQuality}
      </Text>

      {gateMessage ? (
        <Text
          style={[styles.footerMessage, { color: '#FF8B7A' }]}
          testID="quick-capture-gate-message"
        >
          {gateMessage}
        </Text>
      ) : null}
      {errorMessage ? (
        <Text
          style={[styles.footerMessage, { color: '#FF8B7A' }]}
          testID="quick-capture-error-message"
        >
          {errorMessage}
        </Text>
      ) : null}
      {successMessage ? (
        <Text
          style={[styles.footerMessage, { color: activeThemePalette.textPrimary }]}
          testID="quick-capture-success-message"
        >
          {successMessage}
        </Text>
      ) : null}
    </View>
  );
}

export function QuickCaptureScreen() {
  const { useCases, clock } = useCompositionRoot();
  const { colors } = useTheme();

  return (
    <QuickCaptureScreenView
      activeThemePalette={colors}
      createDreamUseCase={useCases.createDreamUseCase}
      listDreamsUseCase={useCases.listDreamsUseCase}
      now={() => clock.now()}
    />
  );
}
