// app/_layout.tsx
import { Stack, router } from "expo-router"; // ✅ no ThemeProvider here
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import "react-native-reanimated";

import { useFonts } from "expo-font";
import { Provider as PaperProvider } from "react-native-paper";
import { MenuProvider } from "react-native-popup-menu";

import InboundShareBridge from "@/src/bridges/InboundShareBridge";
import "@/src/core/fontawesome";
import useGlobal from "@/src/core/global";
import { ColorScheme, theme } from "@/src/core/theme";

export default function RootLayout() {
  const colorScheme = (useGlobal((s) => s.themeMode) || "light") as ColorScheme;
  const activeFriend = useGlobal((s) => s.activeFriend);
  const activeConnectionId = useGlobal((s) => s.activeConnectionId);

  const [fontsLoaded] = useFonts({
    "LeckerliOne-Regular": require("@/src/assets/fonts/LeckerliOne-Regular.ttf"),
    "MontserratExtraBold": require("@/src/assets/fonts/Montserrat-ExtraBold.ttf"),
  });

  const initialized = useGlobal((state) => state.initialized);
  const init = useGlobal((state) => state.init);

  useEffect(() => {
    init();
  }, [init]);

  const currentTheme = theme[colorScheme];  

  type SharePayload =
  | { text: string }
  | { image: string; filename?: string; base64?: string }
  | { video_url: string; video_filename?: string; video?: string }
  | { voice: string; filename: string; base64?: string };

  type InboundPayload = SharePayload;

  const [queuedPayload, setQueuedPayload] = useState<InboundPayload | null>(null);

  const handleInboundShare = useCallback(
    (payload: InboundPayload | null) => {
      console.log("[Inbound Share] Received:", payload);
      if (!payload) return;
      setQueuedPayload(payload);
    },
    []
  );

  useEffect(() => {
    if (!queuedPayload) return;
    if (!initialized || !fontsLoaded) return;

    if (!activeFriend || !activeConnectionId) {
      console.warn("[Inbound Share] No active chat context; redirecting to Friends");
      router.replace("/(tabs)/Friends");
      return; // Keep queuedPayload until context is ready
    }

    router.replace({
      pathname: "/Message",
      params: {
        id: String(activeConnectionId),
        friend: JSON.stringify(activeFriend),
        inbound: "1",
      },
    });
    setQueuedPayload(null);
  }, [queuedPayload, initialized, fontsLoaded, activeFriend, activeConnectionId]);

  return (
    <>
      <InboundShareBridge onShare={handleInboundShare} />
      {(!initialized || !fontsLoaded) ? null : (
        <MenuProvider>
          <PaperProvider theme={currentTheme}>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Splash" />
              <Stack.Screen name="SignIn" />
              <Stack.Screen name="SignUp" />
              <Stack.Screen name="Message" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
            </Stack>
          </PaperProvider>
        </MenuProvider>
      )}
    </>
  );
  
}

