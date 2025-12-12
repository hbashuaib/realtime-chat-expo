// src/screens/Splash.jsx
import React, { useEffect } from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import Title from "@/src/common/Title";
import useGlobal from "@/src/core/global";
import { theme } from "@/src/core/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function SplashScreen() {
  const initialized = useGlobal((state) => state.initialized);
  const authenticated = useGlobal((state) => state.authenticated);

  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  // ✅ Redirect once initialized/authenticated
  useEffect(() => {
    if (initialized) {
      if (authenticated) {
        router.replace("/(tabs)");
      } else {
        router.replace("/SignIn");
      }
    }
  }, [initialized, authenticated]);

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: currentTheme.colors.background,
        }}
      >
        <StatusBar
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        />

        {/* ✅ Simple Title only, no animation */}
        <Title
          text="BashChat"
          color={currentTheme.colors.textPrimary}
          variant="splash"
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

