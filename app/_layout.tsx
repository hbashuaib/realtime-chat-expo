// app/_layout.tsx
import { Stack, router } from "expo-router"; // ✅ no ThemeProvider here
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import "react-native-reanimated";

import { useFonts } from "expo-font";
import { MenuProvider } from "react-native-popup-menu";
import { Provider as PaperProvider } from "react-native-paper";

import InboundShareBridge, { DebugShareListener } from "../src/bridges/InboundShareBridge";
import "@/src/core/fontawesome";
import useGlobal from "@/src/core/global";
import { ColorScheme, theme } from "@/src/core/theme";

import { DeviceEventEmitter} from "react-native";
import BashShareModule from "bash-share-module";
import DebugSharePing from "@/src/bridges/DebugSharePing";
// import { NativeModules } from "react-native";

// const { BashShareModule } = NativeModules;

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

  const setInboundShare = useGlobal((s: any) => s.setInboundShare);
  const clearInboundShare = useGlobal((s: any) => s.clearInboundShare);

  const [queuedPayload, setQueuedPayload] = useState<InboundPayload | null>(null);

  const [lastPayloadKey, setLastPayloadKey] = useState<string | null>(null);

  const handleInboundShare = useCallback(
    (payload: InboundPayload | null) => {
      if (!payload) return;

      const key = JSON.stringify(payload);
      if (key === lastPayloadKey) {
        console.log("[Inbound Share] Duplicate ignored");
        return;
      }

      console.log("[Inbound Share] Received:", payload);
      setLastPayloadKey(key);
      setQueuedPayload(payload);
      setInboundShare(payload);
    },
    [lastPayloadKey, setInboundShare]
  );

  // ✅ Clear stale payloads on app restart
  useEffect(() => {
    clearInboundShare();
    setQueuedPayload(null);
    setLastPayloadKey(null);
  }, []);

  
  // ✅ Handle queuedPayload correctly: keep until we actually deliver into Message
  useEffect(() => {
    if (!queuedPayload) return;
    if (!initialized || !fontsLoaded) return;

    if (!activeFriend || !activeConnectionId) {
      console.warn("[Inbound Share] No active chat context; redirecting to Friends");
      router.replace("/(tabs)/Friends");
      return; // keep queuedPayload until context is ready
    }

    // Route into Message when friend/connection is ready
    router.replace({
      pathname: "/Message",
      params: {
        id: String(activeConnectionId),
        friend: JSON.stringify(activeFriend),
        inbound: "1",
        // payload: JSON.stringify(queuedPayload), // ✅ hand off payload
        payload: JSON.stringify(
          queuedPayload.kind === "text"
            ? { kind: "text", payload: { text: queuedPayload.text } }
            : queuedPayload
        ),
      },
    });

  }, [queuedPayload, initialized, fontsLoaded, activeFriend, activeConnectionId]);


  return (
    <>
      {/* ✅ Keep bridge always mounted at root */}
      <InboundShareBridge onShare={handleInboundShare} />
      <DebugSharePing />

      <MenuProvider>
        <PaperProvider theme={currentTheme}>
          <>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Splash" />
              <Stack.Screen name="SignIn" />
              <Stack.Screen name="SignUp" />
              <Stack.Screen name="Message" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
            </Stack>
          </>
        </PaperProvider>
      </MenuProvider>
    </>
  ); 
  
}

