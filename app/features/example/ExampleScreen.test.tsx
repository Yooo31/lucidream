import { render, screen, waitFor } from '@testing-library/react-native';

import { FakeClock } from '../../domain';
import type { ThemeSettingsRepository } from '../../theme';
import { THEME_PALETTES, ThemeProvider } from '../../theme';
import { ExampleScreen } from './ExampleScreen';

describe('ExampleScreen', () => {
  it('renders title', () => {
    render(<ExampleScreen />);

    expect(screen.getByText('LuciDream V1')).toBeTruthy();
  });

  it('uses infrared palette when clock time is in the saved sleep window', async () => {
    const clock = new FakeClock(Date.parse('2026-02-26T22:30:00'));
    const settingsRepository: ThemeSettingsRepository = {
      getSleepWindow: async () => ({
        startMinutes: 22 * 60,
        endMinutes: 6 * 60,
      }),
      saveSleepWindow: async () => {},
    };

    render(
      <ThemeProvider clock={clock} settingsRepository={settingsRepository}>
        <ExampleScreen />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('example-screen-container')).toHaveStyle({
        backgroundColor: THEME_PALETTES.infrared.background,
      });
      expect(screen.getByTestId('example-screen-title')).toHaveStyle({
        color: THEME_PALETTES.infrared.textPrimary,
      });
    });
  });
});
