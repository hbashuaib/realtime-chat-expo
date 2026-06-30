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
import useGlobal, { globalStore } from "@/src/core/global";

import { ColorScheme, theme } from "@/src/core/theme";

import { InteractionManager, NativeModules } from "react-native";
const { BashShareModule } = NativeModules;

export default function RootLayout() {
  const colorScheme = (useGlobal((s: any) => s.themeMode) || "light") as ColorScheme;
  const activeFriend = useGlobal((s: any) => s.activeFriend);
  const activeConnectionId = useGlobal((s: any) => s.activeConnectionId);

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


  const [fontsLoaded] = useFonts({
    "LeckerliOne-Regular": require("@/src/assets/fonts/LeckerliOne-Regular.ttf"),
    "MontserratExtraBold": require("@/src/assets/fonts/Montserrat-ExtraBold.ttf"),
  });

  const initialized = useGlobal((state: any) => state.initialized);
  const init = useGlobal((state: any) => state.init);

  useEffect(() => {
    init();
  }, [init]);  

  const handleInboundShare = useCallback(
    (payload: InboundPayload | null) => {
      if (!payload) return;

      const key = JSON.stringify(payload);
      if (key === lastPayloadKey) {
        console.log("[Inbound Share] Duplicate ignored");
        return;
      }

      // ✅ Ignore stale payloads before initialization
      if (!initialized) {
        console.log("[Inbound Share] Ignored payload during startup:", payload);
        return;
      }

      console.log("[Inbound Share] Received fresh payload:", payload);
      setLastPayloadKey(key);
      setQueuedPayload(payload);
      setInboundShare(payload);
    },
    [lastPayloadKey, setInboundShare, initialized]
  );
  
  // ✅ Clear stale payloads on app restart
  useEffect(() => {
    clearInboundShare();
    setQueuedPayload(null);
    setLastPayloadKey(null);
  }, []);
  
  // ✅ Route only once activeFriend + activeConnectionId are ready
  useEffect(() => {
    if (!queuedPayload) return;
    if (!initialized || !fontsLoaded) return;

    if (activeFriend && activeConnectionId) {
      console.log("[Inbound Share] Routing to Message with payload:", queuedPayload);
      router.replace({
        pathname: "/Message",
        params: {
          id: String(activeConnectionId),
          friend: JSON.stringify(activeFriend),
          fromShare: "1",
        },
      });
    }
  }, [queuedPayload, initialized, fontsLoaded, activeFriend, activeConnectionId]);
  
  // ✅ Fetch pending payload once on mount, not forever
  useEffect(() => {
    const checkOnce = async () => {
      try {
        const pending = await BashShareModule.getPendingShare();
        console.log("[RootLayout] initial getPendingShare result:", pending);
        if (pending) {
          const parsed = JSON.parse(pending);
          let normalized;
          if (parsed.kind === "text") {
            normalized = { kind: "text", payload: { text: parsed.payload?.text || parsed.text || "" } };
          } else {
            normalized = parsed;
          }
          setInboundShare(normalized);
          setQueuedPayload(normalized);
        }
      } catch (e) {
        console.log("[RootLayout] Error fetching pending share:", e);
      }
    };

    checkOnce(); // ✅ run once at startup
  }, []);

  return (
    <>
      <InboundShareBridge onShare={handleInboundShare} />
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

