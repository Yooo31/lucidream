import { render, screen } from '@testing-library/react-native';

import { ExampleScreen } from './ExampleScreen';

describe('ExampleScreen', () => {
  it('renders title', () => {
    render(<ExampleScreen />);

    expect(screen.getByText('LuciDream V1')).toBeTruthy();
  });
});
