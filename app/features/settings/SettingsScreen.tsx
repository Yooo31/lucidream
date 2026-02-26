import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

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

export interface SettingsScreenViewProps {
  initialSettings: ThemeSettings;
  activeThemeName: ThemeName;
  activeThemePalette: ThemePalette;
  loadThemeSettingsUseCase: ThemeSettingsReader;
  saveThemeSettingsUseCase: ThemeSettingsWriter;
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

export function SettingsScreenView({
  initialSettings,
  activeThemeName,
  activeThemePalette,
  loadThemeSettingsUseCase,
  saveThemeSettingsUseCase,
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
    setPreviewThemeName(activeThemeName);
  }, [activeThemeName]);

  useEffect(() => {
    let isMounted = true;

    loadThemeSettingsUseCase
      .execute()
      .then((storedSettings) => {
        if (!isMounted) {
          return;
        }

        setSleepStart(formatMinuteOfDay(storedSettings.sleepWindow.startMinutes));
        setSleepEnd(formatMinuteOfDay(storedSettings.sleepWindow.endMinutes));
        setAutoInfraredEnabled(storedSettings.autoInfraredEnabled);
        onApplyThemeSettings(storedSettings);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setErrorMessage('Unable to load theme settings from local storage.');
      });

    return () => {
      isMounted = false;
    };
  }, [loadThemeSettingsUseCase, onApplyThemeSettings]);

  const previewPalette = useMemo(() => THEME_PALETTES[previewThemeName], [previewThemeName]);

  const handleSave = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const startMinutes = parseTimeInput(sleepStart);
    const endMinutes = parseTimeInput(sleepEnd);

    if (startMinutes === null || endMinutes === null) {
      setErrorMessage('Sleep window must use HH:MM format (24-hour).');
      return;
    }

    const nextSettings: ThemeSettings = {
      sleepWindow: {
        startMinutes,
        endMinutes,
      },
      autoInfraredEnabled,
    };

    setIsSaving(true);

    try {
      await saveThemeSettingsUseCase.execute(nextSettings);
      onApplyThemeSettings(nextSettings);
      setSuccessMessage('Settings saved locally.');
    } catch {
      setErrorMessage('Unable to save theme settings locally.');
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
      loadThemeSettingsUseCase={useCases.getThemeSettingsUseCase}
      onApplyThemeSettings={applyThemeSettings}
      saveThemeSettingsUseCase={useCases.saveThemeSettingsUseCase}
    />
  );
}
