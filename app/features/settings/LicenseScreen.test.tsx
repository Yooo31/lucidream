import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { THEME_PALETTES } from '../../theme';
import { LicenseScreenView } from './LicenseScreen';

function createCurrentLicenseReader(licenseType: 'FREE' | 'MEDIUM' | 'PRO') {
  return {
    execute: jest.fn(async () => licenseType),
  };
}

function createCurrentLicenseWriter() {
  return {
    execute: jest.fn<Promise<void>, ['FREE' | 'MEDIUM' | 'PRO']>(async () => undefined),
  };
}

describe('LicenseScreenView', () => {
  it('updates local limits summary when switching license type', async () => {
    const loadCurrentLicenseUseCase = createCurrentLicenseReader('FREE');
    const saveCurrentLicenseUseCase = createCurrentLicenseWriter();

    render(
      <LicenseScreenView
        activeThemePalette={THEME_PALETTES.dark}
        initialLicenseType="FREE"
        loadCurrentLicenseUseCase={loadCurrentLicenseUseCase}
        saveCurrentLicenseUseCase={saveCurrentLicenseUseCase}
      />,
    );

    await waitFor(() => {
      expect(loadCurrentLicenseUseCase.execute).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('license-current-type')).toHaveTextContent('Current: FREE');
      expect(screen.getByTestId('license-summary-dreams-per-day')).toHaveTextContent(
        'Dreams/day: 2',
      );
      expect(screen.getByTestId('license-summary-audio-plays-per-day')).toHaveTextContent(
        'Audio plays/day: Unlimited',
      );
    });

    fireEvent.press(screen.getByTestId('license-select-pro-button'));

    await waitFor(() => {
      expect(saveCurrentLicenseUseCase.execute).toHaveBeenCalledWith('PRO');
      expect(screen.getByTestId('license-current-type')).toHaveTextContent('Current: PRO');
      expect(screen.getByTestId('license-summary-dreams-per-day')).toHaveTextContent(
        'Dreams/day: Unlimited',
      );
      expect(screen.getByTestId('license-summary-audio-plays-per-day')).toHaveTextContent(
        'Audio plays/day: 2',
      );
    });
  });
});
