import { render } from '@testing-library/react-native';
import type { ComponentType, ReactNode } from 'react';

import '@/i18n';
import { ThemeProvider } from '@/theme';

import ChatsScreen from '../chats';
import HealthRecordScreen from '../health-record';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Screen chrome — stub SafeAreaView (no provider in tests).
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const renderScreen = (Screen: ComponentType) =>
  render(
    <ThemeProvider>
      <Screen />
    </ThemeProvider>,
  );

/**
 * P8.T4: Chats + Health Record are MVP placeholders — present in the bottom
 * nav, clearly announced as "coming soon", and deliberately NON-functional:
 * no button, no link, nothing that could pretend to work.
 */
describe.each([
  { title: 'Chats', Screen: ChatsScreen, messagePart: /messaging with your practitioner/ },
  { title: 'Health Record', Screen: HealthRecordScreen, messagePart: /prescriptions, documents/ },
])('$title placeholder (P8.T4)', ({ title, Screen, messagePart }) => {
  it(`renders the ${title} title with an explicit "Coming soon" badge`, () => {
    const screen = renderScreen(Screen);
    // The title leads both the header and the empty state.
    expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    expect(screen.getByText('Coming soon')).toBeTruthy();
  });

  it('explains what will live here, and offers NO working affordance', () => {
    const screen = renderScreen(Screen);
    expect(screen.getByText(messagePart)).toBeTruthy();
    // Non-functional by construction: not a single pressable element.
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
