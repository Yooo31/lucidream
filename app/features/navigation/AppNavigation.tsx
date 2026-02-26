import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, type NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { PlaceholderScreen } from './PlaceholderScreen';

type JournalStackParamList = {
  JournalHome: undefined;
};

type InductionStackParamList = {
  InductionHome: undefined;
};

type PediaStackParamList = {
  PediaHome: undefined;
};

type SettingsStackParamList = {
  SettingsHome: undefined;
};

type RootTabParamList = {
  Journal: NavigatorScreenParams<JournalStackParamList>;
  Induction: NavigatorScreenParams<InductionStackParamList>;
  Pedia: NavigatorScreenParams<PediaStackParamList>;
  Settings: NavigatorScreenParams<SettingsStackParamList>;
};

const JournalStack = createNativeStackNavigator<JournalStackParamList>();
const InductionStack = createNativeStackNavigator<InductionStackParamList>();
const PediaStack = createNativeStackNavigator<PediaStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

const stackScreenOptions = {
  animation: 'none',
  headerShown: false,
} as const;

function JournalHomeScreen() {
  return (
    <PlaceholderScreen
      title="Journal placeholder"
      description="Dream journal features will be added here."
    />
  );
}

function InductionHomeScreen() {
  return (
    <PlaceholderScreen
      title="Induction placeholder"
      description="Induction routines will be added here."
    />
  );
}

function PediaHomeScreen() {
  return (
    <PlaceholderScreen
      title="Pedia placeholder"
      description="Dream encyclopedia content will be added here."
    />
  );
}

function SettingsHomeScreen() {
  return (
    <PlaceholderScreen
      title="Settings placeholder"
      description="App settings will be added here."
    />
  );
}

function JournalStackNavigator() {
  return (
    <JournalStack.Navigator screenOptions={stackScreenOptions}>
      <JournalStack.Screen name="JournalHome" component={JournalHomeScreen} />
    </JournalStack.Navigator>
  );
}

function InductionStackNavigator() {
  return (
    <InductionStack.Navigator screenOptions={stackScreenOptions}>
      <InductionStack.Screen name="InductionHome" component={InductionHomeScreen} />
    </InductionStack.Navigator>
  );
}

function PediaStackNavigator() {
  return (
    <PediaStack.Navigator screenOptions={stackScreenOptions}>
      <PediaStack.Screen name="PediaHome" component={PediaHomeScreen} />
    </PediaStack.Navigator>
  );
}

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={stackScreenOptions}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsHomeScreen} />
    </SettingsStack.Navigator>
  );
}

export function AppNavigation() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen
          name="Journal"
          component={JournalStackNavigator}
          options={{ title: 'Journal' }}
        />
        <Tab.Screen
          name="Induction"
          component={InductionStackNavigator}
          options={{ title: 'Induction' }}
        />
        <Tab.Screen name="Pedia" component={PediaStackNavigator} options={{ title: 'Pedia' }} />
        <Tab.Screen
          name="Settings"
          component={SettingsStackNavigator}
          options={{ title: 'Settings' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
