import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import {
  DEFAULT_REALITY_CHECK_SETTINGS,
  DEFAULT_WBTB_SETTINGS,
  FakeClock,
  type RealityCheckSettings,
  type WbtbSettings,
} from '../../domain';
import {
  type ExportDreamsCsvResult,
  type ExportDreamsPdfResult,
  SaveRealityCheckSettingsUseCase,
  SaveWbtbSettingsUseCase,
  ScheduleRealityChecksUseCase,
  ScheduleWbtbAlarmUseCase,
  WBTB_ALARM_NOTIFICATION_IDENTIFIER,
  type RealityCheckNotificationsClient,
  type WbtbAlarmNotificationsClient,
} from '../../services';
import {
  createLicenseRepositoryMock,
  createRealityCheckSettingsRepositoryMock,
  createUsageLogRepositoryMock,
  createWbtbSettingsRepositoryMock,
} from '../../services/useCases/testing/createRepositoryMocks';
import { THEME_PALETTES, type ThemeSettings } from '../../theme';
import { SettingsScreenView } from './SettingsScreen';

function createThemeSettingsReader(settings: ThemeSettings) {
  return {
    execute: jest.fn(async () => settings),
  };
}

function createThemeSettingsWriter() {
  return {
    execute: jest.fn(async () => undefined),
  };
}

function createRealityCheckSettingsReader(settings: RealityCheckSettings) {
  return {
    execute: jest.fn(async () => settings),
  };
}

function createRealityCheckSettingsWriter() {
  return {
    execute: jest.fn(async () => ({
      scheduledCount: 3,
      skippedByQuotaCount: 0,
      maxRcPerDay: 3,
    })),
  };
}

function createWbtbSettingsReader(settings: WbtbSettings) {
  return {
    execute: jest.fn(async () => settings),
  };
}

function createWbtbSettingsWriter() {
  return {
    execute: jest.fn(async () => ({
      scheduled: false,
      skippedByQuota: false,
      maxWbtbUsesLast7Days: null,
      scheduledFor: null,
      autoStopAt: null,
    })),
  };
}

function createFeatureGateDecision(exportEnabled: boolean) {
  return {
    evaluatedAt: Date.parse('2026-02-26T06:30:00.000Z'),
    todayKey: '2026-02-26',
    last7DaysWindowStartKey: '2026-02-20',
    canCreateDream: true,
    canPlayAudio: true,
    canSendRC: true,
    canUseWBTB: true,
    canAddDrawing: true,
    maxHistoryDays: 7,
    maxDreamsPerDay: 2,
    maxAudioPlaysLast7Days: 1,
    maxAudioPlaysPerDay: null,
    maxTagSearchResults: 5,
    maxRcPerDay: 3,
    maxWbtbUsesLast7Days: 1,
    maxDrawingsPerDream: 1,
    exportEnabled,
  };
}

function createExportDreamsCsvUseCase(
  result: ExportDreamsCsvResult = {
    ok: true,
    filePath: 'file:///sandbox/lucidream/exports/dreams-2026-02-26-1.csv',
    exportedDreamCount: 2,
    decision: createFeatureGateDecision(true),
  },
) {
  return {
    execute: jest.fn(async () => result),
  };
}

function createExportDreamsPdfUseCase(
  result: ExportDreamsPdfResult = {
    ok: true,
    filePath: 'file:///sandbox/lucidream/exports/dreams-2026-02-26-1.pdf',
    exportedDreamCount: 2,
    decision: createFeatureGateDecision(true),
  },
) {
  return {
    execute: jest.fn(async () => result),
  };
}

function createNotificationsClientMock(): jest.Mocked<RealityCheckNotificationsClient> {
  return {
    scheduleNotification: jest.fn<
      Promise<string>,
      [Parameters<RealityCheckNotificationsClient['scheduleNotification']>[0]]
    >(async () => 'notification-id-1'),
    cancelAll: jest.fn(async () => undefined),
  };
}

function createWbtbNotificationsClientMock(): jest.Mocked<WbtbAlarmNotificationsClient> {
  return {
    scheduleNotification: jest.fn<
      Promise<string>,
      [Parameters<WbtbAlarmNotificationsClient['scheduleNotification']>[0]]
    >(async () => WBTB_ALARM_NOTIFICATION_IDENTIFIER),
    cancelNotification: jest.fn<Promise<void>, [string]>(async () => undefined),
  };
}

describe('SettingsScreenView', () => {
  const initialSettings: ThemeSettings = {
    sleepWindow: {
      startMinutes: 23 * 60,
      endMinutes: 7 * 60,
    },
    autoInfraredEnabled: true,
  };

  const initialRealityCheckSettings: RealityCheckSettings = {
    mode: 'RANDOM',
    activeWindow: {
      startMinutes: 9 * 60,
      endMinutes: 22 * 60,
    },
    notificationText: 'Reality check: Am I dreaming right now?',
  };

  const initialWbtbSettings: WbtbSettings = {
    enabled: false,
    afterSleepHours: 6,
    alarmDurationSeconds: 45,
  };

  it('loads settings and persists form values through save use-cases', async () => {
    const loadedSettings: ThemeSettings = {
      sleepWindow: {
        startMinutes: 21 * 60 + 30,
        endMinutes: 6 * 60 + 15,
      },
      autoInfraredEnabled: true,
    };
    const loadedRealityCheckSettings: RealityCheckSettings = {
      mode: 'INTERVAL',
      intervalHours: 4,
      activeWindow: {
        startMinutes: 8 * 60,
        endMinutes: 20 * 60,
      },
      notificationText: 'Am I dreaming?',
    };
    const loadedWbtbSettings: WbtbSettings = {
      enabled: true,
      afterSleepHours: 5,
      alarmDurationSeconds: 30,
    };
    const loadThemeSettingsUseCase = createThemeSettingsReader(loadedSettings);
    const saveThemeSettingsUseCase = createThemeSettingsWriter();
    const loadRealityCheckSettingsUseCase = createRealityCheckSettingsReader(
      loadedRealityCheckSettings,
    );
    const saveRealityCheckSettingsUseCase = createRealityCheckSettingsWriter();
    const loadWbtbSettingsUseCase = createWbtbSettingsReader(loadedWbtbSettings);
    const saveWbtbSettingsUseCase = createWbtbSettingsWriter();
    const exportDreamsCsvUseCase = createExportDreamsCsvUseCase();
    const exportDreamsPdfUseCase = createExportDreamsPdfUseCase();
    const onApplyThemeSettings = jest.fn<void, [ThemeSettings]>();

    render(
      <SettingsScreenView
        activeThemeName="dark"
        activeThemePalette={THEME_PALETTES.dark}
        initialSettings={initialSettings}
        initialRealityCheckSettings={initialRealityCheckSettings}
        initialWbtbSettings={initialWbtbSettings}
        loadThemeSettingsUseCase={loadThemeSettingsUseCase}
        saveThemeSettingsUseCase={saveThemeSettingsUseCase}
        loadRealityCheckSettingsUseCase={loadRealityCheckSettingsUseCase}
        saveRealityCheckSettingsUseCase={saveRealityCheckSettingsUseCase}
        loadWbtbSettingsUseCase={loadWbtbSettingsUseCase}
        saveWbtbSettingsUseCase={saveWbtbSettingsUseCase}
        exportDreamsCsvUseCase={exportDreamsCsvUseCase}
        exportDreamsPdfUseCase={exportDreamsPdfUseCase}
        onApplyThemeSettings={onApplyThemeSettings}
      />,
    );

    await waitFor(() => {
      expect(loadThemeSettingsUseCase.execute).toHaveBeenCalledTimes(1);
      expect(loadRealityCheckSettingsUseCase.execute).toHaveBeenCalledTimes(1);
      expect(loadWbtbSettingsUseCase.execute).toHaveBeenCalledTimes(1);
      expect(screen.getByDisplayValue('21:30')).toBeTruthy();
      expect(screen.getByDisplayValue('06:15')).toBeTruthy();
      expect(screen.getByDisplayValue('4')).toBeTruthy();
      expect(screen.getByDisplayValue('08:00')).toBeTruthy();
      expect(screen.getByDisplayValue('20:00')).toBeTruthy();
      expect(screen.getByDisplayValue('Am I dreaming?')).toBeTruthy();
      expect(screen.getByDisplayValue('5')).toBeTruthy();
      expect(screen.getByDisplayValue('30')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('settings-sleep-start-input'), '22:10');
    fireEvent.changeText(screen.getByTestId('settings-sleep-end-input'), '05:40');
    fireEvent(screen.getByTestId('settings-auto-infrared-switch'), 'valueChange', false);
    fireEvent.press(screen.getByTestId('settings-rc-mode-interval-button'));
    fireEvent.changeText(screen.getByTestId('settings-rc-interval-input'), '6');
    fireEvent.changeText(screen.getByTestId('settings-rc-active-start-input'), '07:00');
    fireEvent.changeText(screen.getByTestId('settings-rc-active-end-input'), '19:00');
    fireEvent.changeText(screen.getByTestId('settings-rc-text-input'), 'Reality check now.');
    fireEvent(screen.getByTestId('settings-wbtb-enabled-switch'), 'valueChange', true);
    fireEvent.changeText(screen.getByTestId('settings-wbtb-after-hours-input'), '4');
    fireEvent.changeText(screen.getByTestId('settings-wbtb-auto-stop-seconds-input'), '25');
    fireEvent.press(screen.getByTestId('settings-save-button'));

    await waitFor(() => {
      expect(saveThemeSettingsUseCase.execute).toHaveBeenCalledWith({
        sleepWindow: {
          startMinutes: 22 * 60 + 10,
          endMinutes: 5 * 60 + 40,
        },
        autoInfraredEnabled: false,
      });
      expect(saveRealityCheckSettingsUseCase.execute).toHaveBeenCalledWith({
        mode: 'INTERVAL',
        intervalHours: 6,
        activeWindow: {
          startMinutes: 7 * 60,
          endMinutes: 19 * 60,
        },
        notificationText: 'Reality check now.',
      });
      expect(saveWbtbSettingsUseCase.execute).toHaveBeenCalledWith({
        enabled: true,
        afterSleepHours: 4,
        alarmDurationSeconds: 25,
      });
    });
    expect(onApplyThemeSettings).toHaveBeenCalledWith({
      sleepWindow: {
        startMinutes: 22 * 60 + 10,
        endMinutes: 5 * 60 + 40,
      },
      autoInfraredEnabled: false,
    });
    expect(screen.getByTestId('settings-success-message')).toBeTruthy();
  });

  it('shows validation error and skips persistence when times are invalid', async () => {
    const loadThemeSettingsUseCase = createThemeSettingsReader(initialSettings);
    const saveThemeSettingsUseCase = createThemeSettingsWriter();
    const loadRealityCheckSettingsUseCase = createRealityCheckSettingsReader(
      initialRealityCheckSettings,
    );
    const saveRealityCheckSettingsUseCase = createRealityCheckSettingsWriter();
    const loadWbtbSettingsUseCase = createWbtbSettingsReader(initialWbtbSettings);
    const saveWbtbSettingsUseCase = createWbtbSettingsWriter();
    const exportDreamsCsvUseCase = createExportDreamsCsvUseCase();
    const exportDreamsPdfUseCase = createExportDreamsPdfUseCase();

    render(
      <SettingsScreenView
        activeThemeName="dark"
        activeThemePalette={THEME_PALETTES.dark}
        initialSettings={initialSettings}
        initialRealityCheckSettings={initialRealityCheckSettings}
        initialWbtbSettings={initialWbtbSettings}
        loadThemeSettingsUseCase={loadThemeSettingsUseCase}
        saveThemeSettingsUseCase={saveThemeSettingsUseCase}
        loadRealityCheckSettingsUseCase={loadRealityCheckSettingsUseCase}
        saveRealityCheckSettingsUseCase={saveRealityCheckSettingsUseCase}
        loadWbtbSettingsUseCase={loadWbtbSettingsUseCase}
        saveWbtbSettingsUseCase={saveWbtbSettingsUseCase}
        exportDreamsCsvUseCase={exportDreamsCsvUseCase}
        exportDreamsPdfUseCase={exportDreamsPdfUseCase}
        onApplyThemeSettings={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByTestId('settings-sleep-start-input'), 'abc');
    fireEvent.press(screen.getByTestId('settings-save-button'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-error-message')).toHaveTextContent(
        'Sleep window must use HH:MM format (24-hour).',
      );
    });
    expect(saveThemeSettingsUseCase.execute).not.toHaveBeenCalled();
    expect(saveRealityCheckSettingsUseCase.execute).not.toHaveBeenCalled();
    expect(saveWbtbSettingsUseCase.execute).not.toHaveBeenCalled();
  });

  it('shows a clear gate message when FREE blocks CSV export', async () => {
    const loadThemeSettingsUseCase = createThemeSettingsReader(initialSettings);
    const saveThemeSettingsUseCase = createThemeSettingsWriter();
    const loadRealityCheckSettingsUseCase = createRealityCheckSettingsReader(
      initialRealityCheckSettings,
    );
    const saveRealityCheckSettingsUseCase = createRealityCheckSettingsWriter();
    const loadWbtbSettingsUseCase = createWbtbSettingsReader(initialWbtbSettings);
    const saveWbtbSettingsUseCase = createWbtbSettingsWriter();
    const exportDreamsCsvUseCase = createExportDreamsCsvUseCase({
      ok: false,
      code: 'EXPORT_NOT_AVAILABLE',
      decision: createFeatureGateDecision(false),
    });
    const exportDreamsPdfUseCase = createExportDreamsPdfUseCase();

    render(
      <SettingsScreenView
        activeThemeName="dark"
        activeThemePalette={THEME_PALETTES.dark}
        initialSettings={initialSettings}
        initialRealityCheckSettings={initialRealityCheckSettings}
        initialWbtbSettings={initialWbtbSettings}
        loadThemeSettingsUseCase={loadThemeSettingsUseCase}
        saveThemeSettingsUseCase={saveThemeSettingsUseCase}
        loadRealityCheckSettingsUseCase={loadRealityCheckSettingsUseCase}
        saveRealityCheckSettingsUseCase={saveRealityCheckSettingsUseCase}
        loadWbtbSettingsUseCase={loadWbtbSettingsUseCase}
        saveWbtbSettingsUseCase={saveWbtbSettingsUseCase}
        exportDreamsCsvUseCase={exportDreamsCsvUseCase}
        exportDreamsPdfUseCase={exportDreamsPdfUseCase}
        onApplyThemeSettings={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId('settings-export-dreams-button'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-error-message')).toHaveTextContent(
        'CSV export is available on MEDIUM and PRO only. Change your local license to unlock it.',
      );
    });
    expect(exportDreamsCsvUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('invokes PDF export and renders local success path', async () => {
    const loadThemeSettingsUseCase = createThemeSettingsReader(initialSettings);
    const saveThemeSettingsUseCase = createThemeSettingsWriter();
    const loadRealityCheckSettingsUseCase = createRealityCheckSettingsReader(
      initialRealityCheckSettings,
    );
    const saveRealityCheckSettingsUseCase = createRealityCheckSettingsWriter();
    const loadWbtbSettingsUseCase = createWbtbSettingsReader(initialWbtbSettings);
    const saveWbtbSettingsUseCase = createWbtbSettingsWriter();
    const exportDreamsCsvUseCase = createExportDreamsCsvUseCase();
    const exportDreamsPdfUseCase = createExportDreamsPdfUseCase({
      ok: true,
      filePath: 'file:///sandbox/lucidream/exports/dreams-2026-02-26-1.pdf',
      exportedDreamCount: 2,
      decision: createFeatureGateDecision(true),
    });

    render(
      <SettingsScreenView
        activeThemeName="dark"
        activeThemePalette={THEME_PALETTES.dark}
        initialSettings={initialSettings}
        initialRealityCheckSettings={initialRealityCheckSettings}
        initialWbtbSettings={initialWbtbSettings}
        loadThemeSettingsUseCase={loadThemeSettingsUseCase}
        saveThemeSettingsUseCase={saveThemeSettingsUseCase}
        loadRealityCheckSettingsUseCase={loadRealityCheckSettingsUseCase}
        saveRealityCheckSettingsUseCase={saveRealityCheckSettingsUseCase}
        loadWbtbSettingsUseCase={loadWbtbSettingsUseCase}
        saveWbtbSettingsUseCase={saveWbtbSettingsUseCase}
        exportDreamsCsvUseCase={exportDreamsCsvUseCase}
        exportDreamsPdfUseCase={exportDreamsPdfUseCase}
        onApplyThemeSettings={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId('settings-export-dreams-pdf-button'));

    await waitFor(() => {
      expect(exportDreamsPdfUseCase.execute).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('settings-success-message')).toHaveTextContent(
        'PDF exported locally (2 dreams): file:///sandbox/lucidream/exports/dreams-2026-02-26-1.pdf',
      );
    });
  });

  it('shows a clear gate message when FREE blocks PDF export', async () => {
    const loadThemeSettingsUseCase = createThemeSettingsReader(initialSettings);
    const saveThemeSettingsUseCase = createThemeSettingsWriter();
    const loadRealityCheckSettingsUseCase = createRealityCheckSettingsReader(
      initialRealityCheckSettings,
    );
    const saveRealityCheckSettingsUseCase = createRealityCheckSettingsWriter();
    const loadWbtbSettingsUseCase = createWbtbSettingsReader(initialWbtbSettings);
    const saveWbtbSettingsUseCase = createWbtbSettingsWriter();
    const exportDreamsCsvUseCase = createExportDreamsCsvUseCase();
    const exportDreamsPdfUseCase = createExportDreamsPdfUseCase({
      ok: false,
      code: 'EXPORT_NOT_AVAILABLE',
      decision: createFeatureGateDecision(false),
    });

    render(
      <SettingsScreenView
        activeThemeName="dark"
        activeThemePalette={THEME_PALETTES.dark}
        initialSettings={initialSettings}
        initialRealityCheckSettings={initialRealityCheckSettings}
        initialWbtbSettings={initialWbtbSettings}
        loadThemeSettingsUseCase={loadThemeSettingsUseCase}
        saveThemeSettingsUseCase={saveThemeSettingsUseCase}
        loadRealityCheckSettingsUseCase={loadRealityCheckSettingsUseCase}
        saveRealityCheckSettingsUseCase={saveRealityCheckSettingsUseCase}
        loadWbtbSettingsUseCase={loadWbtbSettingsUseCase}
        saveWbtbSettingsUseCase={saveWbtbSettingsUseCase}
        exportDreamsCsvUseCase={exportDreamsCsvUseCase}
        exportDreamsPdfUseCase={exportDreamsPdfUseCase}
        onApplyThemeSettings={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId('settings-export-dreams-pdf-button'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-error-message')).toHaveTextContent(
        'PDF export is available on MEDIUM and PRO only. Change your local license to unlock it.',
      );
    });
    expect(exportDreamsPdfUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('schedules notifications when saving reality check settings', async () => {
    const loadThemeSettingsUseCase = createThemeSettingsReader(initialSettings);
    const saveThemeSettingsUseCase = createThemeSettingsWriter();
    const loadRealityCheckSettingsUseCase = createRealityCheckSettingsReader({
      ...DEFAULT_REALITY_CHECK_SETTINGS,
      mode: 'INTERVAL',
      intervalHours: 4,
      activeWindow: {
        startMinutes: 0,
        endMinutes: 0,
      },
    });
    const loadWbtbSettingsUseCase = createWbtbSettingsReader(DEFAULT_WBTB_SETTINGS);
    const saveWbtbSettingsUseCase = createWbtbSettingsWriter();
    const notificationsClient = createNotificationsClientMock();
    const clock = new FakeClock(Date.parse('2026-02-26T10:00:00.000Z'));
    const usageLogRepository = createUsageLogRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('FREE');
    const settingsRepository = createRealityCheckSettingsRepositoryMock();
    const scheduleRealityChecksUseCase = new ScheduleRealityChecksUseCase(
      notificationsClient,
      usageLogRepository,
      licenseRepository,
      clock,
      () => 0.5,
    );
    const saveRealityCheckSettingsUseCase = new SaveRealityCheckSettingsUseCase(
      settingsRepository,
      scheduleRealityChecksUseCase,
    );
    const exportDreamsCsvUseCase = createExportDreamsCsvUseCase();
    const exportDreamsPdfUseCase = createExportDreamsPdfUseCase();

    render(
      <SettingsScreenView
        activeThemeName="dark"
        activeThemePalette={THEME_PALETTES.dark}
        initialSettings={initialSettings}
        initialRealityCheckSettings={initialRealityCheckSettings}
        initialWbtbSettings={initialWbtbSettings}
        loadThemeSettingsUseCase={loadThemeSettingsUseCase}
        saveThemeSettingsUseCase={saveThemeSettingsUseCase}
        loadRealityCheckSettingsUseCase={loadRealityCheckSettingsUseCase}
        saveRealityCheckSettingsUseCase={saveRealityCheckSettingsUseCase}
        loadWbtbSettingsUseCase={loadWbtbSettingsUseCase}
        saveWbtbSettingsUseCase={saveWbtbSettingsUseCase}
        exportDreamsCsvUseCase={exportDreamsCsvUseCase}
        exportDreamsPdfUseCase={exportDreamsPdfUseCase}
        onApplyThemeSettings={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(loadRealityCheckSettingsUseCase.execute).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(screen.getByTestId('settings-rc-mode-interval-button'));
    fireEvent.changeText(screen.getByTestId('settings-rc-interval-input'), '6');
    fireEvent.changeText(screen.getByTestId('settings-rc-active-start-input'), '00:00');
    fireEvent.changeText(screen.getByTestId('settings-rc-active-end-input'), '00:00');
    fireEvent.changeText(screen.getByTestId('settings-rc-text-input'), 'Reality check now.');
    fireEvent.press(screen.getByTestId('settings-save-button'));

    await waitFor(() => {
      expect(notificationsClient.scheduleNotification).toHaveBeenCalled();
    });
    expect(settingsRepository.saveRealityCheckSettings).toHaveBeenCalledWith({
      mode: 'INTERVAL',
      intervalHours: 6,
      activeWindow: {
        startMinutes: 0,
        endMinutes: 0,
      },
      notificationText: 'Reality check now.',
    });
    expect(usageLogRepository.create).toHaveBeenCalled();
  });

  it('schedules a WBTB alarm when saving WBTB settings', async () => {
    const loadThemeSettingsUseCase = createThemeSettingsReader(initialSettings);
    const saveThemeSettingsUseCase = createThemeSettingsWriter();
    const loadRealityCheckSettingsUseCase = createRealityCheckSettingsReader(
      DEFAULT_REALITY_CHECK_SETTINGS,
    );
    const saveRealityCheckSettingsUseCase = createRealityCheckSettingsWriter();
    const loadWbtbSettingsUseCase = createWbtbSettingsReader({
      enabled: true,
      afterSleepHours: 4,
      alarmDurationSeconds: 20,
    });
    const notificationsClient = createWbtbNotificationsClientMock();
    const clock = new FakeClock(Date.parse('2026-02-26T22:00:00.000Z'));
    const usageLogRepository = createUsageLogRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('FREE');
    const settingsRepository = createWbtbSettingsRepositoryMock();
    const scheduleWbtbAlarmUseCase = new ScheduleWbtbAlarmUseCase(
      notificationsClient,
      usageLogRepository,
      licenseRepository,
      clock,
    );
    const saveWbtbSettingsUseCase = new SaveWbtbSettingsUseCase(
      settingsRepository,
      scheduleWbtbAlarmUseCase,
    );
    const exportDreamsCsvUseCase = createExportDreamsCsvUseCase();
    const exportDreamsPdfUseCase = createExportDreamsPdfUseCase();

    render(
      <SettingsScreenView
        activeThemeName="dark"
        activeThemePalette={THEME_PALETTES.dark}
        initialSettings={initialSettings}
        initialRealityCheckSettings={initialRealityCheckSettings}
        initialWbtbSettings={initialWbtbSettings}
        loadThemeSettingsUseCase={loadThemeSettingsUseCase}
        saveThemeSettingsUseCase={saveThemeSettingsUseCase}
        loadRealityCheckSettingsUseCase={loadRealityCheckSettingsUseCase}
        saveRealityCheckSettingsUseCase={saveRealityCheckSettingsUseCase}
        loadWbtbSettingsUseCase={loadWbtbSettingsUseCase}
        saveWbtbSettingsUseCase={saveWbtbSettingsUseCase}
        exportDreamsCsvUseCase={exportDreamsCsvUseCase}
        exportDreamsPdfUseCase={exportDreamsPdfUseCase}
        onApplyThemeSettings={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(loadWbtbSettingsUseCase.execute).toHaveBeenCalledTimes(1);
    });

    fireEvent(screen.getByTestId('settings-wbtb-enabled-switch'), 'valueChange', true);
    fireEvent.changeText(screen.getByTestId('settings-wbtb-after-hours-input'), '6');
    fireEvent.changeText(screen.getByTestId('settings-wbtb-auto-stop-seconds-input'), '45');
    fireEvent.press(screen.getByTestId('settings-save-button'));

    await waitFor(() => {
      expect(notificationsClient.scheduleNotification).toHaveBeenCalledWith({
        identifier: WBTB_ALARM_NOTIFICATION_IDENTIFIER,
        content: {
          title: 'WBTB Alarm',
          body: 'Wake up for your wake-back-to-bed session.',
          data: {
            type: 'wbtb-alarm',
            autoStopAt: Date.parse('2026-02-27T04:00:45.000Z'),
            alarmDurationSeconds: 45,
          },
        },
        trigger: {
          type: 'date',
          date: new Date('2026-02-27T04:00:00.000Z'),
        },
      });
    });
    expect(settingsRepository.saveWbtbSettings).toHaveBeenCalledWith({
      enabled: true,
      afterSleepHours: 6,
      alarmDurationSeconds: 45,
    });
    expect(usageLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WBTB_SCHEDULED',
        createdAt: Date.parse('2026-02-26T22:00:00.000Z'),
      }),
    );
  });
});
