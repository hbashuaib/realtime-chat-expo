// scr/screens/profile.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';

import useGlobal from '@/src/core/global';
import Thumbnail from '@/src/common/Thumbnail';
import { theme } from '@/src/core/theme';          // ✅ named import
import { useColorScheme } from '@/hooks/use-color-scheme'; // ✅ hook

export default function ProfileScreen() {
  const router = useRouter();
  const user = useGlobal((s) => s.user);
  const logout = useGlobal((s) => s.logout);
  const toggleTheme = useGlobal((s) => s.toggleTheme);
  const themeMode = useGlobal((s) => s.themeMode);
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme]; // ✅ resolve light/dark theme

  console.log("Profile themeMode:", themeMode, "colorScheme:", colorScheme);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: currentTheme.colors.background }, // ✅ dynamic background
      ]}
    >
      {/* User thumbnail with edit pencil overlay */}
      <View style={styles.thumbnailWrapper}>
        <Thumbnail url={user?.thumbnail} size={100} />
        <TouchableOpacity
          style={[
            styles.editButton,
            { backgroundColor: currentTheme.colors.primary }, // ✅ dynamic color
          ]}
          onPress={() => router.push('/editProfile')}
        >
          <FontAwesomeIcon icon="pencil" size={18} color={currentTheme.colors.headerText} />
        </TouchableOpacity>
      </View>

      {/* Username */}
      <Text
        style={[
          styles.username,
          { color: currentTheme.colors.textPrimary }, // ✅ dynamic text color
        ]}
      >
        {user?.name ?? 'Your Name'}
      </Text>

      {/* Logout button */}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: currentTheme.colors.primary }, // ✅ dynamic color
        ]}
        onPress={() => {
          logout();
          router.replace('/SignIn');
        }}
      >
        <Text style={[styles.buttonText, { color: currentTheme.colors.headerText }]}>
          Logout
        </Text>
      </TouchableOpacity>

      {/* Theme toggle button */}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: currentTheme.colors.bubbleFriend }, // ✅ use a secondary background
        ]}
        onPress={() => {
          toggleTheme?.()
          console.log("Theme after toggle:", useGlobal.getState().themeMode);
        }}
      >
        <Text
          style={[
            styles.buttonText,
            { color: currentTheme.colors.textPrimary }, // ✅ dynamic text color
          ]}
        >
          {/* Switch to {colorScheme === 'dark' ? 'Light' : 'Dark'} Mode */}
          Switch to {themeMode === 'dark' ? 'Light' : 'Dark'} Mode
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  thumbnailWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 16,
    padding: 6,
    elevation: 4,
  },
  username: {
    fontFamily: 'MontserratExtraBold',
    fontSize: 22,
    marginBottom: 30,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
