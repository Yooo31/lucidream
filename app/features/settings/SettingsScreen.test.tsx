import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

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

describe('SettingsScreenView', () => {
  const initialSettings: ThemeSettings = {
    sleepWindow: {
      startMinutes: 23 * 60,
      endMinutes: 7 * 60,
    },
    autoInfraredEnabled: true,
  };

  it('loads settings and persists form values through save use-case', async () => {
    const loadedSettings: ThemeSettings = {
      sleepWindow: {
        startMinutes: 21 * 60 + 30,
        endMinutes: 6 * 60 + 15,
      },
      autoInfraredEnabled: true,
    };
    const loadThemeSettingsUseCase = createThemeSettingsReader(loadedSettings);
    const saveThemeSettingsUseCase = createThemeSettingsWriter();
    const onApplyThemeSettings = jest.fn<void, [ThemeSettings]>();

    render(
      <SettingsScreenView
        activeThemeName="dark"
        activeThemePalette={THEME_PALETTES.dark}
        initialSettings={initialSettings}
        loadThemeSettingsUseCase={loadThemeSettingsUseCase}
        onApplyThemeSettings={onApplyThemeSettings}
        saveThemeSettingsUseCase={saveThemeSettingsUseCase}
      />,
    );

    await waitFor(() => {
      expect(loadThemeSettingsUseCase.execute).toHaveBeenCalledTimes(1);
      expect(screen.getByDisplayValue('21:30')).toBeTruthy();
      expect(screen.getByDisplayValue('06:15')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('settings-sleep-start-input'), '22:10');
    fireEvent.changeText(screen.getByTestId('settings-sleep-end-input'), '05:40');
    fireEvent(screen.getByTestId('settings-auto-infrared-switch'), 'valueChange', false);
    fireEvent.press(screen.getByTestId('settings-save-button'));

    await waitFor(() => {
      expect(saveThemeSettingsUseCase.execute).toHaveBeenCalledWith({
        sleepWindow: {
          startMinutes: 22 * 60 + 10,
          endMinutes: 5 * 60 + 40,
        },
        autoInfraredEnabled: false,
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

    render(
      <SettingsScreenView
        activeThemeName="dark"
        activeThemePalette={THEME_PALETTES.dark}
        initialSettings={initialSettings}
        loadThemeSettingsUseCase={loadThemeSettingsUseCase}
        onApplyThemeSettings={jest.fn()}
        saveThemeSettingsUseCase={saveThemeSettingsUseCase}
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
  });
});
