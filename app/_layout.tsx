// app/_layout.tsx
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import 'react-native-reanimated';

import { useFonts } from 'expo-font';
import { Provider as PaperProvider } from 'react-native-paper';
import { MenuProvider } from 'react-native-popup-menu';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';

//import { useColorScheme } from '@/hooks/use-color-scheme';
import { theme } from '@/src/core/theme';
import useGlobal from '@/src/core/global';
import '@/src/core/fontawesome';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() { 
  // Subscribe root layout directly to global themeMode
  const colorScheme = useGlobal((s) => s.themeMode); // 'light' | 'dark'

  console.log("RootLayout colorScheme:", colorScheme);

  const [fontsLoaded] = useFonts({
    'LeckerliOne-Regular': require('@/src/assets/fonts/LeckerliOne-Regular.ttf'),
    'MontserratExtraBold': require('@/src/assets/fonts/Montserrat-ExtraBold.ttf'),
  });

  const initialized = useGlobal((state) => state.initialized);
  const init = useGlobal((state) => state.init);

  useEffect(() => {
    init();
  }, [init]);

  // 👇 Guard mounting until init + fonts ready
  if (!initialized || !fontsLoaded) return null;

  // 👇 No assertion needed, hook guarantees 'light' | 'dark'
  const currentTheme = theme[colorScheme as 'light' | 'dark'];

  const navigationTheme = {
    ...DefaultTheme,
    dark: colorScheme === 'dark',
    colors: {
      ...DefaultTheme.colors,
      primary: currentTheme.colors.primary,
      background: currentTheme.colors.background,
      card: currentTheme.colors.background,
      text: currentTheme.colors.textPrimary,
      border: currentTheme.colors.border,
      notification: currentTheme.colors.primary,
    },
  };

  return (
    <MenuProvider>
      <ThemeProvider value={navigationTheme}>
        <PaperProvider>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Splash" />
            <Stack.Screen name="SignIn" />
            <Stack.Screen name="SignUp" />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="Message" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', title: 'Modal' }}
            />
          </Stack>
        </PaperProvider>
      </ThemeProvider>
    </MenuProvider>
  );
}

