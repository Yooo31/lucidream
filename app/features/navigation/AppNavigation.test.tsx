import type { ComponentType, PropsWithChildren, ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => {
  const React = jest.requireActual('react');

  function NavigationContainer({ children }: PropsWithChildren) {
    return React.createElement(React.Fragment, null, children);
  }

  return { NavigationContainer };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');

  function createBottomTabNavigator() {
    function Navigator({ children }: PropsWithChildren) {
      const [activeTabIndex, setActiveTabIndex] = React.useState(0);
      const tabScreens = React.Children.toArray(children) as ReactElement[];
      const activeTab = tabScreens[activeTabIndex] ?? null;

      return React.createElement(
        View,
        null,
        React.createElement(
          View,
          null,
          tabScreens.map((tabScreen, index) => {
            const props = tabScreen.props as { name: string; options?: { title?: string } };
            const label = props.options?.title ?? props.name;

            return React.createElement(
              Pressable,
              {
                key: props.name,
                accessibilityRole: 'button',
                onPress: () => setActiveTabIndex(index),
              },
              React.createElement(Text, null, label),
            );
          }),
        ),
        activeTab,
      );
    }

    function Screen({ component: Component }: { component: ComponentType<Record<string, never>> }) {
      return React.createElement(Component, {});
    }

    return { Navigator, Screen };
  }

  return { createBottomTabNavigator };
});

jest.mock('@react-navigation/native-stack', () => {
  const React = jest.requireActual('react');

  function createNativeStackNavigator() {
    function Navigator({ children }: PropsWithChildren) {
      return React.createElement(React.Fragment, null, children);
    }
    function Screen({ component: Component }: { component: ComponentType<Record<string, never>> }) {
      return React.createElement(Component, {});
    }

    return { Navigator, Screen };
  }

  return { createNativeStackNavigator };
});

const { AppNavigation } = jest.requireActual('./AppNavigation') as {
  AppNavigation: () => ReactElement;
};

describe('AppNavigation', () => {
  it('renders tab labels and allows switching tabs', async () => {
    render(<AppNavigation />);

    expect(screen.getByText('Journal')).toBeTruthy();
    expect(screen.getByText('Induction')).toBeTruthy();
    expect(screen.getByText('Pedia')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Journal placeholder')).toBeTruthy();

    fireEvent.press(screen.getByText('Induction'));
    expect(await screen.findByText('Induction placeholder')).toBeTruthy();

    fireEvent.press(screen.getByText('Pedia'));
    expect(await screen.findByText('Pedia placeholder')).toBeTruthy();

    fireEvent.press(screen.getByText('Settings'));
    expect(await screen.findByText('Settings placeholder')).toBeTruthy();
  });
});
