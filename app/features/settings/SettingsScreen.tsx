import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import {
  DEFAULT_REALITY_CHECK_SETTINGS,
  type RealityCheckMode,
  type RealityCheckSettings,
} from '../../domain';
import { useCompositionRoot } from '../../composition';
import {
  THEME_PALETTES,
  useTheme,
  type ThemeName,
  type ThemePalette,
  type ThemeSettings,
} from '../../theme';

interface ThemeSettingsReader {
  execute(): Promise<ThemeSettings>;
}

interface ThemeSettingsWriter {
  execute(settings: ThemeSettings): Promise<void>;
}

interface RealityCheckSettingsReader {
  execute(): Promise<RealityCheckSettings>;
}

interface SaveRealityCheckSettingsResult {
  scheduledCount: number;
  skippedByQuotaCount: number;
  maxRcPerDay: number | null;
}

interface RealityCheckSettingsWriter {
  execute(settings: RealityCheckSettings): Promise<SaveRealityCheckSettingsResult>;
}

export interface SettingsScreenViewProps {
  initialSettings: ThemeSettings;
  initialRealityCheckSettings: RealityCheckSettings;
  activeThemeName: ThemeName;
  activeThemePalette: ThemePalette;
  loadThemeSettingsUseCase: ThemeSettingsReader;
  saveThemeSettingsUseCase: ThemeSettingsWriter;
  loadRealityCheckSettingsUseCase: RealityCheckSettingsReader;
  saveRealityCheckSettingsUseCase: RealityCheckSettingsWriter;
  onApplyThemeSettings: (settings: ThemeSettings) => void;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  errorText: {
    fontSize: 13,
    marginTop: 10,
  },
  field: {
    marginTop: 14,
  },
  fieldLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
    height: 44,
    paddingHorizontal: 12,
  },
  modeButton: {
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
    minWidth: 120,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  modeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  previewButton: {
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
    minWidth: 120,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  previewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  previewCard: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  previewSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  saveButton: {
    borderRadius: 12,
    marginTop: 18,
    paddingVertical: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  section: {
    borderRadius: 12,
    marginTop: 14,
    padding: 14,
  },
  sectionDescription: {
    fontSize: 13,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  successText: {
    fontSize: 13,
    marginTop: 10,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
});

function formatMinuteOfDay(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function parseTimeInput(value: string): number | null {
  const normalizedValue = value.trim();
  const match = normalizedValue.match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  if (!match) {
    return null;
  }

  const hours = match[1];
  const minutes = match[2];

  if (hours === undefined || minutes === undefined) {
    return null;
  }

  return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
}

function formatRealityCheckIntervalHours(settings: RealityCheckSettings): string {
  if (settings.mode === 'INTERVAL') {
    return settings.intervalHours.toString();
  }

  return '';
}

function parseIntervalHours(value: string): number | null {
  if (value.trim().length === 0) {
    return null;
  }

  const parsed = Number.parseInt(value.trim(), 10);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

function getSaveSuccessMessage(result: SaveRealityCheckSettingsResult): string {
  const quotaLabel =
    result.maxRcPerDay === null ? 'unlimited daily quota' : `daily quota ${result.maxRcPerDay}`;

  if (result.skippedByQuotaCount > 0) {
    return [
      `Settings saved locally. Scheduled ${result.scheduledCount} reality checks`,
      `(${quotaLabel}; ${result.skippedByQuotaCount} skipped by quota).`,
    ].join(' ');
  }

  return [
    `Settings saved locally. Scheduled ${result.scheduledCount} reality checks`,
    `(${quotaLabel}).`,
  ].join(' ');
}

export function SettingsScreenView({
  initialSettings,
  initialRealityCheckSettings,
  activeThemeName,
  activeThemePalette,
  loadThemeSettingsUseCase,
  saveThemeSettingsUseCase,
  loadRealityCheckSettingsUseCase,
  saveRealityCheckSettingsUseCase,
  onApplyThemeSettings,
}: SettingsScreenViewProps) {
  const [sleepStart, setSleepStart] = useState<string>(
    formatMinuteOfDay(initialSettings.sleepWindow.startMinutes),
  );
  const [sleepEnd, setSleepEnd] = useState<string>(
    formatMinuteOfDay(initialSettings.sleepWindow.endMinutes),
  );
  const [autoInfraredEnabled, setAutoInfraredEnabled] = useState<boolean>(
    initialSettings.autoInfraredEnabled,
  );
  const [rcMode, setRcMode] = useState<RealityCheckMode>(initialRealityCheckSettings.mode);
  const [rcIntervalHours, setRcIntervalHours] = useState<string>(
    formatRealityCheckIntervalHours(initialRealityCheckSettings),
  );
  const [rcActiveStart, setRcActiveStart] = useState<string>(
    formatMinuteOfDay(initialRealityCheckSettings.activeWindow.startMinutes),
  );
  const [rcActiveEnd, setRcActiveEnd] = useState<string>(
    formatMinuteOfDay(initialRealityCheckSettings.activeWindow.endMinutes),
  );
  const [rcNotificationText, setRcNotificationText] = useState<string>(
    initialRealityCheckSettings.notificationText,
  );
  const [previewThemeName, setPreviewThemeName] = useState<ThemeName>(activeThemeName);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSleepStart(formatMinuteOfDay(initialSettings.sleepWindow.startMinutes));
    setSleepEnd(formatMinuteOfDay(initialSettings.sleepWindow.endMinutes));
    setAutoInfraredEnabled(initialSettings.autoInfraredEnabled);
  }, [
    initialSettings.autoInfraredEnabled,
    initialSettings.sleepWindow.endMinutes,
    initialSettings.sleepWindow.startMinutes,
  ]);

  useEffect(() => {
    setRcMode(initialRealityCheckSettings.mode);
    setRcIntervalHours(formatRealityCheckIntervalHours(initialRealityCheckSettings));
    setRcActiveStart(formatMinuteOfDay(initialRealityCheckSettings.activeWindow.startMinutes));
    setRcActiveEnd(formatMinuteOfDay(initialRealityCheckSettings.activeWindow.endMinutes));
    setRcNotificationText(initialRealityCheckSettings.notificationText);
  }, [initialRealityCheckSettings]);

  useEffect(() => {
    setPreviewThemeName(activeThemeName);
  }, [activeThemeName]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([loadThemeSettingsUseCase.execute(), loadRealityCheckSettingsUseCase.execute()])
      .then(([storedThemeSettings, storedRealityCheckSettings]) => {
        if (!isMounted) {
          return;
        }

        setSleepStart(formatMinuteOfDay(storedThemeSettings.sleepWindow.startMinutes));
        setSleepEnd(formatMinuteOfDay(storedThemeSettings.sleepWindow.endMinutes));
        setAutoInfraredEnabled(storedThemeSettings.autoInfraredEnabled);
        onApplyThemeSettings(storedThemeSettings);

        setRcMode(storedRealityCheckSettings.mode);
        setRcIntervalHours(formatRealityCheckIntervalHours(storedRealityCheckSettings));
        setRcActiveStart(formatMinuteOfDay(storedRealityCheckSettings.activeWindow.startMinutes));
        setRcActiveEnd(formatMinuteOfDay(storedRealityCheckSettings.activeWindow.endMinutes));
        setRcNotificationText(storedRealityCheckSettings.notificationText);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setErrorMessage('Unable to load settings from local storage.');
      });

    return () => {
      isMounted = false;
    };
  }, [loadRealityCheckSettingsUseCase, loadThemeSettingsUseCase, onApplyThemeSettings]);

  const previewPalette = useMemo(() => THEME_PALETTES[previewThemeName], [previewThemeName]);

  const handleSave = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const sleepStartMinutes = parseTimeInput(sleepStart);
    const sleepEndMinutes = parseTimeInput(sleepEnd);
    const rcStartMinutes = parseTimeInput(rcActiveStart);
    const rcEndMinutes = parseTimeInput(rcActiveEnd);

    if (sleepStartMinutes === null || sleepEndMinutes === null) {
      setErrorMessage('Sleep window must use HH:MM format (24-hour).');
      return;
    }

    if (rcStartMinutes === null || rcEndMinutes === null) {
      setErrorMessage('Reality Check active hours must use HH:MM format (24-hour).');
      return;
    }

    const notificationText = rcNotificationText.trim();

    if (notificationText.length === 0) {
      setErrorMessage('Reality Check notification text is required.');
      return;
    }

    const nextThemeSettings: ThemeSettings = {
      sleepWindow: {
        startMinutes: sleepStartMinutes,
        endMinutes: sleepEndMinutes,
      },
      autoInfraredEnabled,
    };

    let nextRealityCheckSettings: RealityCheckSettings;

    if (rcMode === 'INTERVAL') {
      const intervalHours = parseIntervalHours(rcIntervalHours);

      if (intervalHours === null) {
        setErrorMessage('Reality Check interval must be a positive integer (hours).');
        return;
      }

      nextRealityCheckSettings = {
        mode: 'INTERVAL',
        intervalHours,
        activeWindow: {
          startMinutes: rcStartMinutes,
          endMinutes: rcEndMinutes,
        },
        notificationText,
      };
    } else {
      nextRealityCheckSettings = {
        mode: 'RANDOM',
        activeWindow: {
          startMinutes: rcStartMinutes,
          endMinutes: rcEndMinutes,
        },
        notificationText,
      };
    }

    setIsSaving(true);

    try {
      await saveThemeSettingsUseCase.execute(nextThemeSettings);
      onApplyThemeSettings(nextThemeSettings);

      const scheduleResult =
        await saveRealityCheckSettingsUseCase.execute(nextRealityCheckSettings);

      setSuccessMessage(getSaveSuccessMessage(scheduleResult));
    } catch {
      setErrorMessage('Unable to save settings locally.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: activeThemePalette.background }]}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: activeThemePalette.textPrimary }]}
      >
        Settings
      </Text>

      <View
        style={[
          styles.section,
          {
            backgroundColor: '#0E0E0E',
            borderColor: activeThemePalette.textSecondary,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: activeThemePalette.textPrimary }]}>
          Sleep Window
        </Text>
        <Text style={[styles.sectionDescription, { color: activeThemePalette.textSecondary }]}>
          Configure start and end times in local device time (HH:MM).
        </Text>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: activeThemePalette.textPrimary }]}>
            Sleep start
          </Text>
          <TextInput
            accessibilityLabel="Sleep window start"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            onChangeText={setSleepStart}
            placeholder="23:00"
            placeholderTextColor={activeThemePalette.textSecondary}
            style={[
              styles.input,
              {
                borderColor: activeThemePalette.textSecondary,
                color: activeThemePalette.textPrimary,
              },
            ]}
            testID="settings-sleep-start-input"
            value={sleepStart}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: activeThemePalette.textPrimary }]}>
            Sleep end
          </Text>
          <TextInput
            accessibilityLabel="Sleep window end"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            onChangeText={setSleepEnd}
            placeholder="07:00"
            placeholderTextColor={activeThemePalette.textSecondary}
            style={[
              styles.input,
              {
                borderColor: activeThemePalette.textSecondary,
                color: activeThemePalette.textPrimary,
              },
            ]}
            testID="settings-sleep-end-input"
            value={sleepEnd}
          />
        </View>

        <View style={styles.rowBetween}>
          <Text
            style={[styles.fieldLabel, { color: activeThemePalette.textPrimary, marginBottom: 0 }]}
          >
            Auto Infrared mode
          </Text>
          <Switch
            accessibilityLabel="Auto Infrared mode"
            onValueChange={setAutoInfraredEnabled}
            testID="settings-auto-infrared-switch"
            value={autoInfraredEnabled}
          />
        </View>
      </View>

      <View
        style={[
          styles.section,
          {
            backgroundColor: '#101010',
            borderColor: activeThemePalette.textSecondary,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: activeThemePalette.textPrimary }]}>
          Reality Checks
        </Text>
        <Text style={[styles.sectionDescription, { color: activeThemePalette.textSecondary }]}>
          Configure local reminder mode, active hours, and notification text.
        </Text>

        <View style={styles.modeButtons}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRcMode('RANDOM')}
            style={[
              styles.modeButton,
              {
                borderColor: activeThemePalette.textSecondary,
                backgroundColor: rcMode === 'RANDOM' ? '#1E1E1E' : 'transparent',
              },
            ]}
            testID="settings-rc-mode-random-button"
          >
            <Text style={[styles.modeButtonText, { color: activeThemePalette.textPrimary }]}>
              Random
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRcMode('INTERVAL')}
            style={[
              styles.modeButton,
              {
                borderColor: activeThemePalette.textSecondary,
                backgroundColor: rcMode === 'INTERVAL' ? '#1E1E1E' : 'transparent',
              },
            ]}
            testID="settings-rc-mode-interval-button"
          >
            <Text style={[styles.modeButtonText, { color: activeThemePalette.textPrimary }]}>
              Every X hours
            </Text>
          </Pressable>
        </View>

        {rcMode === 'INTERVAL' ? (
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: activeThemePalette.textPrimary }]}>
              Interval (hours)
            </Text>
            <TextInput
              accessibilityLabel="Reality Check interval hours"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              onChangeText={setRcIntervalHours}
              placeholder="3"
              placeholderTextColor={activeThemePalette.textSecondary}
              style={[
                styles.input,
                {
                  borderColor: activeThemePalette.textSecondary,
                  color: activeThemePalette.textPrimary,
                },
              ]}
              testID="settings-rc-interval-input"
              value={rcIntervalHours}
            />
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: activeThemePalette.textPrimary }]}>
            Active start
          </Text>
          <TextInput
            accessibilityLabel="Reality Check active start"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            onChangeText={setRcActiveStart}
            placeholder="09:00"
            placeholderTextColor={activeThemePalette.textSecondary}
            style={[
              styles.input,
              {
                borderColor: activeThemePalette.textSecondary,
                color: activeThemePalette.textPrimary,
              },
            ]}
            testID="settings-rc-active-start-input"
            value={rcActiveStart}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: activeThemePalette.textPrimary }]}>
            Active end
          </Text>
          <TextInput
            accessibilityLabel="Reality Check active end"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            onChangeText={setRcActiveEnd}
            placeholder="22:00"
            placeholderTextColor={activeThemePalette.textSecondary}
            style={[
              styles.input,
              {
                borderColor: activeThemePalette.textSecondary,
                color: activeThemePalette.textPrimary,
              },
            ]}
            testID="settings-rc-active-end-input"
            value={rcActiveEnd}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: activeThemePalette.textPrimary }]}>
            Notification text
          </Text>
          <TextInput
            accessibilityLabel="Reality Check notification text"
            autoCapitalize="sentences"
            autoCorrect
            multiline
            onChangeText={setRcNotificationText}
            placeholder="Reality check: Am I dreaming right now?"
            placeholderTextColor={activeThemePalette.textSecondary}
            style={[
              styles.textArea,
              {
                borderColor: activeThemePalette.textSecondary,
                color: activeThemePalette.textPrimary,
              },
            ]}
            testID="settings-rc-text-input"
            value={rcNotificationText}
          />
        </View>
      </View>

      <View
        style={[
          styles.section,
          {
            backgroundColor: '#101010',
            borderColor: activeThemePalette.textSecondary,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: activeThemePalette.textPrimary }]}>
          Theme Preview
        </Text>
        <Text style={[styles.sectionDescription, { color: activeThemePalette.textSecondary }]}>
          Preview dark or infrared palette before saving.
        </Text>

        <View style={styles.previewButtons}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPreviewThemeName('dark')}
            style={[
              styles.previewButton,
              {
                borderColor: activeThemePalette.textSecondary,
                backgroundColor: previewThemeName === 'dark' ? '#1E1E1E' : 'transparent',
              },
            ]}
            testID="settings-preview-dark-button"
          >
            <Text style={[styles.previewButtonText, { color: activeThemePalette.textPrimary }]}>
              Dark
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPreviewThemeName('infrared')}
            style={[
              styles.previewButton,
              {
                borderColor: activeThemePalette.textSecondary,
                backgroundColor: previewThemeName === 'infrared' ? '#1E1E1E' : 'transparent',
              },
            ]}
            testID="settings-preview-infrared-button"
          >
            <Text style={[styles.previewButtonText, { color: activeThemePalette.textPrimary }]}>
              Infrared
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.previewCard,
            {
              backgroundColor: previewPalette.background,
              borderColor: previewPalette.textSecondary,
            },
          ]}
          testID="settings-theme-preview"
        >
          <Text style={[styles.previewTitle, { color: previewPalette.textPrimary }]}>
            Preview {previewThemeName}
          </Text>
          <Text style={[styles.previewSubtitle, { color: previewPalette.textSecondary }]}>
            LuciDream night readability sample.
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={isSaving}
        onPress={handleSave}
        style={[
          styles.saveButton,
          {
            backgroundColor: activeThemePalette.textPrimary,
            opacity: isSaving ? 0.7 : 1,
          },
        ]}
        testID="settings-save-button"
      >
        <Text style={[styles.saveButtonText, { color: activeThemePalette.background }]}>
          {isSaving ? 'Saving...' : 'Save settings'}
        </Text>
      </Pressable>

      {errorMessage ? (
        <Text style={[styles.errorText, { color: '#FF6B6B' }]} testID="settings-error-message">
          {errorMessage}
        </Text>
      ) : null}
      {successMessage ? (
        <Text
          style={[styles.successText, { color: activeThemePalette.textPrimary }]}
          testID="settings-success-message"
        >
          {successMessage}
        </Text>
      ) : null}
    </View>
  );
}

export function SettingsScreen() {
  const { useCases } = useCompositionRoot();
  const { sleepWindow, autoInfraredEnabled, themeName, colors, applyThemeSettings } = useTheme();

  return (
    <SettingsScreenView
      activeThemeName={themeName}
      activeThemePalette={colors}
      initialSettings={{
        sleepWindow,
        autoInfraredEnabled,
      }}
      initialRealityCheckSettings={DEFAULT_REALITY_CHECK_SETTINGS}
      loadThemeSettingsUseCase={useCases.getThemeSettingsUseCase}
      saveThemeSettingsUseCase={useCases.saveThemeSettingsUseCase}
      loadRealityCheckSettingsUseCase={useCases.getRealityCheckSettingsUseCase}
      saveRealityCheckSettingsUseCase={useCases.saveRealityCheckSettingsUseCase}
      onApplyThemeSettings={applyThemeSettings}
    />
  );
}
