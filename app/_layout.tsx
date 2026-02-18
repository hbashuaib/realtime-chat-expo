// app/_layout.tsx
import { Stack, router } from "expo-router"; // ✅ no ThemeProvider here
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import "react-native-reanimated";

import { useFonts } from "expo-font";
import { Provider as PaperProvider } from "react-native-paper";
import { MenuProvider } from "react-native-popup-menu";

import InboundShareBridge, { DebugShareListener } from "../src/bridges/InboundShareBridge";
import "@/src/core/fontawesome";
import useGlobal from "@/src/core/global";
import { ColorScheme, theme } from "@/src/core/theme";

import { DeviceEventEmitter} from "react-native";
import BashShareModule from "bash-share-module";

console.log(
  "[Debug] BashShareModule keys:",
  BashShareModule ? Object.keys(BashShareModule) : []
);

export default function RootLayout() {
  const colorScheme = (useGlobal((s: any) => s.themeMode) || "light") as ColorScheme;
  const activeFriend = useGlobal((s: any) => s.activeFriend);
  const activeConnectionId = useGlobal((s: any) => s.activeConnectionId);

  const [fontsLoaded] = useFonts({
    "LeckerliOne-Regular": require("@/src/assets/fonts/LeckerliOne-Regular.ttf"),
    "MontserratExtraBold": require("@/src/assets/fonts/Montserrat-ExtraBold.ttf"),
  });

  const initialized = useGlobal((state: any) => state.initialized);
  const init = useGlobal((state: any) => state.init);

  useEffect(() => {
    init();
  }, [init]);

  // Debug ping to BashShareModule
  useEffect(() => {
    if (BashShareModule?.ping) {
      BashShareModule.ping().then((res: string) =>
        console.log("[Debug] Ping result:", res)
      );
    } else {
      console.warn("[Debug] BashShareModule.ping not available");
    } 
  }, []);

  const currentTheme = theme[colorScheme];  

  type SharePayload =
  | { kind: "text"; text: string }
  | { kind: "image"; image: string; filename?: string; base64?: string }
  | { kind: "video"; video_url: string; video_filename?: string; video?: string }
  | { kind: "voice"; voice: string; filename: string; base64?: string };

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
 
  useEffect(() => {
    if (BashShareModule?.consumePendingShare) {
      let attempts = 0;
      const interval = setInterval(() => {
        BashShareModule.consumePendingShare()
          .then((res: string | null) => {
            console.log("[RootLayout] Early consumePendingShare result:", res);
            if (res) {
              try {
                const parsed = JSON.parse(res);
                handleInboundShare(parsed);
                clearInterval(interval); // stop once we got something
              } catch {
                handleInboundShare({ kind: "text", text: String(res) });
                clearInterval(interval);
              }
            }
          })
          .catch((err: any) => console.error("[RootLayout] consumePendingShare error:", err));

        attempts++;
        if (attempts > 5) clearInterval(interval); // stop after ~5 seconds
      }, 1000); // poll every 1s
    }
  }, []);

  return (
    <>
      {console.log("[RootLayout] Rendering InboundShareBridge")}
      <InboundShareBridge onShare={handleInboundShare} />
      <DebugShareListener />
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

