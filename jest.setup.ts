import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => {
  const reanimatedMock = jest.requireActual('react-native-reanimated/mock');

  if (
    reanimatedMock.default &&
    typeof reanimatedMock.default === 'object' &&
    'call' in reanimatedMock.default
  ) {
    (reanimatedMock.default as { call?: () => void }).call = () => {};
  }

  return reanimatedMock;
});

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 320, height: 640 };
  const SafeAreaInsetsContext = React.createContext(insets);
  const SafeAreaFrameContext = React.createContext(frame);

  return {
    SafeAreaProvider: ({ children }: { children?: unknown }) =>
      React.createElement(View, null, children),
    SafeAreaView: ({ children }: { children?: unknown }) =>
      React.createElement(View, null, children),
    SafeAreaConsumer: ({ children }: { children: (value: typeof insets) => unknown }) =>
      children(insets),
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

jest.mock('react-native-screens', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  function MockScreen({ children }: { children?: unknown }) {
    return React.createElement(View, null, children);
  }

  return {
    enableScreens: jest.fn(),
    screensEnabled: jest.fn(),
    Screen: MockScreen,
    ScreenContainer: MockScreen,
    ScreenStack: MockScreen,
    ScreenStackItem: MockScreen,
    ScreenStackHeaderConfig: MockScreen,
    ScreenStackHeaderSubview: MockScreen,
    SearchBar: MockScreen,
    FullWindowOverlay: MockScreen,
    NativeScreenNavigationContainer: MockScreen,
    ScreenFooter: MockScreen,
    executeNativeBackPress: jest.fn(),
    useTransitionProgress: () => ({
      progress: { interpolate: () => 1 },
      closing: { interpolate: () => 0 },
      goingForward: { interpolate: () => 1 },
    }),
  };
});
