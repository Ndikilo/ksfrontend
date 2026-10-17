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
 *
 * Review 014 MINOR-7: the screen title lives ONLY in the header — the
 * EmptyState below is message-led with its own distinct line, so the title
 * never renders twice on one screen.
 */
describe.each([
  {
    title: 'Chats',
    Screen: ChatsScreen,
    emptyTitle: 'Messaging opens soon',
    messagePart: /Conversations with the practitioners/,
  },
  {
    title: 'Health record',
    Screen: HealthRecordScreen,
    emptyTitle: 'Your records are on their way',
    messagePart: /Prescriptions, documents and visit history/,
  },
])('$title placeholder (P8.T4)', ({ title, Screen, emptyTitle, messagePart }) => {
  it(`renders the ${title} title exactly once, with an explicit "Coming soon" badge`, () => {
    const screen = renderScreen(Screen);
    // The title is the header's alone — the empty state never repeats it.
    expect(screen.getAllByText(title)).toHaveLength(1);
    expect(screen.getByText('Coming soon')).toBeTruthy();
  });

  it('the empty state is message-led with a distinct line, and offers NO working affordance', () => {
    const screen = renderScreen(Screen);
    expect(screen.getByText(emptyTitle)).toBeTruthy();
    expect(screen.getByText(messagePart)).toBeTruthy();
    // Non-functional by construction: not a single pressable element.
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
