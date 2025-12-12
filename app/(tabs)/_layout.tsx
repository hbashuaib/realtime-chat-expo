// app/(tabs)/_layout.tsx
import React, { useEffect } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme'; // ✅ normalized hook

import Thumbnail from '@/src/common/Thumbnail';
import HeaderMenu from '@/src/components/HeaderMenu';
import FloatingEmojiButton from '@/src/components/FloatingEmojiButton';
import useGlobal from '@/src/core/global';
import { theme } from '@/src/core/theme';

import '@/src/core/fontawesome';
import Title from '@/src/common/Title';

export default function TabsLayout() {
  const user = useGlobal((s) => s.user);
  const socketConnect = useGlobal((s) => s.socketConnect);
  const socketClose = useGlobal((s) => s.socketClose);
  const insets = useSafeAreaInsets();

  // 👇 Subscribe at component level so TabsLayout re-renders on theme changes
  const colorScheme = useColorScheme();
  const colors = theme[colorScheme as 'light' | 'dark'].colors;
  const spacing = theme[colorScheme as 'light' | 'dark'].spacing;

  console.log("TabsLayout colorScheme:", colorScheme);

  useEffect(() => {
    socketConnect();
    return () => socketClose();
  }, [socketConnect, socketClose]);

  return (
    <>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: true,

          headerTitle:
            route.name === 'Friends'
              ? () => (
                  <Title
                    text="BashChat"
                    color={colors.primary}
                    variant="friends"
                  />
                )
              : undefined,

          headerLeft:
            route.name === 'Friends'
              ? () => null
              : () => (
                  <View style={{ marginLeft: 16, marginRight: 10 }}>
                    <Thumbnail url={user?.thumbnail} size={28} />
                  </View>
                ),

          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => router.push('/Search')}>
                <FontAwesomeIcon
                  style={{ marginRight: spacing.md }}
                  icon="magnifying-glass"
                  size={22}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
              <HeaderMenu screen={route.name} />
            </View>
          ),

          tabBarButton: HapticTab,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarShowLabel: false,

          tabBarStyle: {
            backgroundColor: colors.inputBackground,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
          },

          tabBarIcon: ({ color }) => {
            switch (route.name) {
              case 'Friends':
                return (
                  <FontAwesomeIcon icon="comment-dots" size={28} color={color} />
                );
              case 'Requests':
                return (
                  <FontAwesomeIcon icon="user-plus" size={28} color={color} />
                );
              case 'Profile':
                return (
                  <FontAwesomeIcon icon="id-badge" size={26} color={color} />
                );
              default:
                return null;
            }
          },
        })}
      >
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="Friends" options={{ title: 'Friends' }} />
        <Tabs.Screen name="Requests" options={{ title: 'Requests' }} />
        <Tabs.Screen name="Profile" options={{ title: 'Profile' }} />
      </Tabs>
      <FloatingEmojiButton />
    </>
  );
}

