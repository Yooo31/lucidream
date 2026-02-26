import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import {
  DEFAULT_REALITY_CHECK_SETTINGS,
  DEFAULT_WBTB_SETTINGS,
  type RealityCheckMode,
  type RealityCheckSettings,
  type WbtbSettings,
} from '../../domain';
import { useCompositionRoot } from '../../composition';
import type { ExportDreamsCsvResult, ExportDreamsPdfResult } from '../../services';
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

interface WbtbSettingsReader {
  execute(): Promise<WbtbSettings>;
}

interface SaveWbtbSettingsResult {
  scheduled: boolean;
  skippedByQuota: boolean;
  maxWbtbUsesLast7Days: number | null;
  scheduledFor: number | null;
  autoStopAt: number | null;
}

interface WbtbSettingsWriter {
  execute(settings: WbtbSettings): Promise<SaveWbtbSettingsResult>;
}

interface DreamsCsvExporter {
  execute(): Promise<ExportDreamsCsvResult>;
}

interface DreamsPdfExporter {
  execute(): Promise<ExportDreamsPdfResult>;
}

export interface SettingsScreenViewProps {
  initialSettings: ThemeSettings;
  initialRealityCheckSettings: RealityCheckSettings;
  initialWbtbSettings: WbtbSettings;
  activeThemeName: ThemeName;
  activeThemePalette: ThemePalette;
  loadThemeSettingsUseCase: ThemeSettingsReader;
  saveThemeSettingsUseCase: ThemeSettingsWriter;
  loadRealityCheckSettingsUseCase: RealityCheckSettingsReader;
  saveRealityCheckSettingsUseCase: RealityCheckSettingsWriter;
  loadWbtbSettingsUseCase: WbtbSettingsReader;
  saveWbtbSettingsUseCase: WbtbSettingsWriter;
  exportDreamsCsvUseCase: DreamsCsvExporter;
  exportDreamsPdfUseCase: DreamsPdfExporter;
  onApplyThemeSettings: (settings: ThemeSettings) => void;
  onOpenLicenseScreen?: () => void;
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
  secondaryActionButton: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
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

function parsePositiveInteger(value: string): number | null {
  const parsed = Number.parseInt(value.trim(), 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
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

function getWbtbSuccessMessage(result: SaveWbtbSettingsResult): string {
  const quotaLabel =
    result.maxWbtbUsesLast7Days === null
      ? 'unlimited weekly quota'
      : `weekly quota ${result.maxWbtbUsesLast7Days}`;

  if (result.skippedByQuota) {
    return `WBTB alarm not scheduled (${quotaLabel} reached).`;
  }

  if (!result.scheduled || result.scheduledFor === null || result.autoStopAt === null) {
    return 'WBTB alarm disabled.';
  }

  return `WBTB alarm scheduled (${quotaLabel}; auto-stop after ${Math.max(
    0,
    Math.floor((result.autoStopAt - result.scheduledFor) / 1000),
  )}s).`;
}

export function SettingsScreenView({
  initialSettings,
  initialRealityCheckSettings,
  initialWbtbSettings,
  activeThemeName,
  activeThemePalette,
  loadThemeSettingsUseCase,
  saveThemeSettingsUseCase,
  loadRealityCheckSettingsUseCase,
  saveRealityCheckSettingsUseCase,
  loadWbtbSettingsUseCase,
  saveWbtbSettingsUseCase,
  exportDreamsCsvUseCase,
  exportDreamsPdfUseCase,
  onApplyThemeSettings,
  onOpenLicenseScreen,
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
  const [wbtbEnabled, setWbtbEnabled] = useState<boolean>(initialWbtbSettings.enabled);
  const [wbtbAfterSleepHours, setWbtbAfterSleepHours] = useState<string>(
    initialWbtbSettings.afterSleepHours.toString(),
  );
  const [wbtbAlarmDurationSeconds, setWbtbAlarmDurationSeconds] = useState<string>(
    initialWbtbSettings.alarmDurationSeconds.toString(),
  );
  const [previewThemeName, setPreviewThemeName] = useState<ThemeName>(activeThemeName);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [lastExportedPdfPath, setLastExportedPdfPath] = useState<string | null>(null);

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
    setWbtbEnabled(initialWbtbSettings.enabled);
    setWbtbAfterSleepHours(initialWbtbSettings.afterSleepHours.toString());
    setWbtbAlarmDurationSeconds(initialWbtbSettings.alarmDurationSeconds.toString());
  }, [
    initialWbtbSettings.afterSleepHours,
    initialWbtbSettings.alarmDurationSeconds,
    initialWbtbSettings.enabled,
  ]);

  useEffect(() => {
    setPreviewThemeName(activeThemeName);
  }, [activeThemeName]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      loadThemeSettingsUseCase.execute(),
      loadRealityCheckSettingsUseCase.execute(),
      loadWbtbSettingsUseCase.execute(),
    ])
      .then(([storedThemeSettings, storedRealityCheckSettings, storedWbtbSettings]) => {
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

        setWbtbEnabled(storedWbtbSettings.enabled);
        setWbtbAfterSleepHours(storedWbtbSettings.afterSleepHours.toString());
        setWbtbAlarmDurationSeconds(storedWbtbSettings.alarmDurationSeconds.toString());
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
  }, [
    loadRealityCheckSettingsUseCase,
    loadThemeSettingsUseCase,
    loadWbtbSettingsUseCase,
    onApplyThemeSettings,
  ]);

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

    const afterSleepHours = parsePositiveInteger(wbtbAfterSleepHours);
    const alarmDurationSeconds = parsePositiveInteger(wbtbAlarmDurationSeconds);

    if (afterSleepHours === null) {
      setErrorMessage('WBTB delay must be a positive integer (hours).');
      return;
    }

    if (alarmDurationSeconds === null) {
      setErrorMessage('WBTB auto-stop must be a positive integer (seconds).');
      return;
    }

    const nextWbtbSettings: WbtbSettings = {
      enabled: wbtbEnabled,
      afterSleepHours,
      alarmDurationSeconds,
    };

    setIsSaving(true);

    try {
      await saveThemeSettingsUseCase.execute(nextThemeSettings);
      onApplyThemeSettings(nextThemeSettings);

      const scheduleRealityChecksResult =
        await saveRealityCheckSettingsUseCase.execute(nextRealityCheckSettings);
      const scheduleWbtbResult = await saveWbtbSettingsUseCase.execute(nextWbtbSettings);
      const saveSuccessMessage = [
        getSaveSuccessMessage(scheduleRealityChecksResult),
        getWbtbSuccessMessage(scheduleWbtbResult),
      ].join(' ');

      setSuccessMessage(saveSuccessMessage);
    } catch {
      setErrorMessage('Unable to save settings locally.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportDreamsCsv = async () => {
    if (isExporting) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsExporting(true);

    try {
      const result = await exportDreamsCsvUseCase.execute();

      if (!result.ok) {
        if (result.code === 'EXPORT_NOT_AVAILABLE') {
          setErrorMessage(
            [
              'CSV export is available on MEDIUM and PRO only.',
              'Change your local license to unlock it.',
            ].join(' '),
          );
          return;
        }

        setErrorMessage('Unable to export dreams to CSV right now.');
        return;
      }

      setSuccessMessage(
        `CSV exported locally (${result.exportedDreamCount} dreams): ${result.filePath}`,
      );
    } catch {
      setErrorMessage('Unable to export dreams to CSV right now.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDreamsPdf = async () => {
    if (isExportingPdf) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsExportingPdf(true);

    try {
      const result = await exportDreamsPdfUseCase.execute();

      if (!result.ok) {
        if (result.code === 'EXPORT_NOT_AVAILABLE') {
          setErrorMessage(
            [
              'PDF export is available on MEDIUM and PRO only.',
              'Change your local license to unlock it.',
            ].join(' '),
          );
          return;
        }

        setErrorMessage('Unable to export dreams to PDF right now.');
        return;
      }

      setLastExportedPdfPath(result.filePath);
      setSuccessMessage(
        `PDF exported locally (${result.exportedDreamCount} dreams): ${result.filePath}`,
      );
    } catch {
      setErrorMessage('Unable to export dreams to PDF right now.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleOpenLastPdf = async () => {
    if (lastExportedPdfPath === null) {
      return;
    }

    setErrorMessage(null);

    try {
      await Linking.openURL(lastExportedPdfPath);
    } catch {
      setErrorMessage('Unable to open the local PDF file on this device.');
    }
  };

  const handleShareLastPdf = async () => {
    if (lastExportedPdfPath === null) {
      return;
    }

    setErrorMessage(null);

    try {
      await Share.share({
        title: 'Dream journal PDF',
        message: lastExportedPdfPath,
        url: lastExportedPdfPath,
      });
    } catch {
      setErrorMessage('Unable to share the local PDF file right now.');
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
            backgroundColor: '#101010',
            borderColor: activeThemePalette.textSecondary,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: activeThemePalette.textPrimary }]}>
          License
        </Text>
        <Text style={[styles.sectionDescription, { color: activeThemePalette.textSecondary }]}>
          Manage FREE, MEDIUM, and PRO locally with feature-gate limits preview.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenLicenseScreen}
          style={[
            styles.secondaryActionButton,
            {
              borderColor: activeThemePalette.textSecondary,
              backgroundColor: 'transparent',
            },
          ]}
          testID="settings-open-license-button"
        >
          <Text
            style={[styles.secondaryActionButtonText, { color: activeThemePalette.textPrimary }]}
          >
            Open license screen
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isExporting}
          onPress={handleExportDreamsCsv}
          style={[
            styles.secondaryActionButton,
            {
              borderColor: activeThemePalette.textSecondary,
              backgroundColor: 'transparent',
              opacity: isExporting ? 0.7 : 1,
            },
          ]}
          testID="settings-export-dreams-button"
        >
          <Text
            style={[styles.secondaryActionButtonText, { color: activeThemePalette.textPrimary }]}
          >
            {isExporting ? 'Exporting CSV...' : 'Export dreams as CSV'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isExportingPdf}
          onPress={handleExportDreamsPdf}
          style={[
            styles.secondaryActionButton,
            {
              borderColor: activeThemePalette.textSecondary,
              backgroundColor: 'transparent',
              opacity: isExportingPdf ? 0.7 : 1,
            },
          ]}
          testID="settings-export-dreams-pdf-button"
        >
          <Text
            style={[styles.secondaryActionButtonText, { color: activeThemePalette.textPrimary }]}
          >
            {isExportingPdf ? 'Exporting PDF...' : 'Export dreams as PDF'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={lastExportedPdfPath === null}
          onPress={handleOpenLastPdf}
          style={[
            styles.secondaryActionButton,
            {
              borderColor: activeThemePalette.textSecondary,
              backgroundColor: 'transparent',
              opacity: lastExportedPdfPath === null ? 0.6 : 1,
            },
          ]}
          testID="settings-open-last-pdf-button"
        >
          <Text
            style={[styles.secondaryActionButtonText, { color: activeThemePalette.textPrimary }]}
          >
            Open last PDF
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={lastExportedPdfPath === null}
          onPress={handleShareLastPdf}
          style={[
            styles.secondaryActionButton,
            {
              borderColor: activeThemePalette.textSecondary,
              backgroundColor: 'transparent',
              opacity: lastExportedPdfPath === null ? 0.6 : 1,
            },
          ]}
          testID="settings-share-last-pdf-button"
        >
          <Text
            style={[styles.secondaryActionButtonText, { color: activeThemePalette.textPrimary }]}
          >
            Share last PDF
          </Text>
        </Pressable>
      </View>

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
          WBTB Alarm
        </Text>
        <Text style={[styles.sectionDescription, { color: activeThemePalette.textSecondary }]}>
          Schedule a local wake-back-to-bed alarm after N sleep hours with automatic stop.
        </Text>

        <View style={styles.rowBetween}>
          <Text
            style={[styles.fieldLabel, { color: activeThemePalette.textPrimary, marginBottom: 0 }]}
          >
            Enable WBTB alarm
          </Text>
          <Switch
            accessibilityLabel="Enable WBTB alarm"
            onValueChange={setWbtbEnabled}
            testID="settings-wbtb-enabled-switch"
            value={wbtbEnabled}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: activeThemePalette.textPrimary }]}>
            After sleep (hours)
          </Text>
          <TextInput
            accessibilityLabel="WBTB after sleep hours"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            onChangeText={setWbtbAfterSleepHours}
            placeholder="6"
            placeholderTextColor={activeThemePalette.textSecondary}
            style={[
              styles.input,
              {
                borderColor: activeThemePalette.textSecondary,
                color: activeThemePalette.textPrimary,
              },
            ]}
            testID="settings-wbtb-after-hours-input"
            value={wbtbAfterSleepHours}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: activeThemePalette.textPrimary }]}>
            Auto-stop (seconds)
          </Text>
          <TextInput
            accessibilityLabel="WBTB auto-stop seconds"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            onChangeText={setWbtbAlarmDurationSeconds}
            placeholder="45"
            placeholderTextColor={activeThemePalette.textSecondary}
            style={[
              styles.input,
              {
                borderColor: activeThemePalette.textSecondary,
                color: activeThemePalette.textPrimary,
              },
            ]}
            testID="settings-wbtb-auto-stop-seconds-input"
            value={wbtbAlarmDurationSeconds}
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

interface SettingsScreenProps {
  onOpenLicenseScreen?: () => void;
}

export function SettingsScreen({ onOpenLicenseScreen }: SettingsScreenProps) {
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
      initialWbtbSettings={DEFAULT_WBTB_SETTINGS}
      loadThemeSettingsUseCase={useCases.getThemeSettingsUseCase}
      saveThemeSettingsUseCase={useCases.saveThemeSettingsUseCase}
      loadRealityCheckSettingsUseCase={useCases.getRealityCheckSettingsUseCase}
      saveRealityCheckSettingsUseCase={useCases.saveRealityCheckSettingsUseCase}
      loadWbtbSettingsUseCase={useCases.getWbtbSettingsUseCase}
      saveWbtbSettingsUseCase={useCases.saveWbtbSettingsUseCase}
      exportDreamsCsvUseCase={useCases.exportDreamsCsvUseCase}
      exportDreamsPdfUseCase={useCases.exportDreamsPdfUseCase}
      onApplyThemeSettings={applyThemeSettings}
      {...(onOpenLicenseScreen ? { onOpenLicenseScreen } : {})}
    />
  );
}
