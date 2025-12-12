// app/(tabs)/index.tsx
import { Redirect } from 'expo-router';

export default function TabsIndex() {
  return <Redirect href="/Friends" />;
}

// Hide this route from the tab bar
export const options = {
  href: null,
};

