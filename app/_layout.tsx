// app/_layout.tsx
import { Stack, router, usePathname } from "expo-router"; // ✅ no ThemeProvider here
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

  const pathname = usePathname();

  const [fontsLoaded] = useFonts({
    "LeckerliOne-Regular": require("@/src/assets/fonts/LeckerliOne-Regular.ttf"),
    "MontserratExtraBold": require("@/src/assets/fonts/Montserrat-ExtraBold.ttf"),
  });

  const initialized = useGlobal((state: any) => state.initialized);
  const init = useGlobal((state: any) => state.init);

  // ✅ Call debug logs inside a component
  useEffect(() => {
    globalStore.getState().debugLogState();
  }, []);

  useEffect(() => {
    init();
  }, [init]);  

  // ✅ Trigger socketConnect once tokens are ready
  useEffect(() => {
    const state = globalStore.getState();
    const tokens = state.tokens; // <-- requires tokens to be typed in GlobalState

    if (tokens?.access && !state.socketReady && !state.socketConnecting) {
      console.log("[RootLayout] Tokens ready, starting socketConnect");
      state.socketConnect();
    }
  }, [useGlobal((s: any) => s.tokens?.access)]);


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
  
  // ✅ Reset only local state, not global inboundShare
  useEffect(() => {    
    setQueuedPayload(null);
    setLastPayloadKey(null);
    // ❌ Do NOT clearInboundShare here — let inboundShare survive startup
    console.log("[RootLayout - Inbound] Reset local queued state at startup (inboundShare preserved)");
  }, []);

  // ✅ Reactively listen to inboundShare from global store
  const inboundShare = useGlobal((s: any) => s.inboundShare);
  
  // ✅ Reactively listen to inboundShare from global store
  useEffect(() => {
    if (!inboundShare) return;

    console.log("[RootLayout - Inbound] inboundShare effect fired");
    console.log("[Debug - Inbound] inboundShare:", inboundShare);
    console.log("[Debug - Inbound] activeFriend:", activeFriend);
    console.log("[Debug - Inbound] activeConnectionId:", activeConnectionId);
    console.log("[Debug - Inbound] initialized:", initialized);

    // 🚨 If this is a stale payload from a previous run, clear it immediately
    if (!initialized || !inboundShare.payload?.text) {
      console.log("[RootLayout - Inbound] Clearing stale inboundShare at startup:", inboundShare);
      // clearInboundShare();
      setQueuedPayload(null);
      return;
    }

    console.log("[RootLayout - Inbound] Detected inboundShare:", inboundShare);

    // Show banner immediately
    setQueuedPayload(inboundShare);

    // 🚨 Do not auto-navigate here.
    // Just keep payload queued so FriendsScreen can show the banner.
    if (activeFriend && activeConnectionId) {
      let normalized: InboundPayload | null = null;

      if (inboundShare.kind === "text") {
        normalized = { kind: "text", text: inboundShare.payload?.text || "" };
      } else if (inboundShare.kind === "image") {
        normalized = {
          kind: "image",
          image: inboundShare.payload?.image || "",
          filename: inboundShare.payload?.filename,
          base64: inboundShare.payload?.base64,
        };
      } else if (inboundShare.kind === "video") {
        normalized = {
          kind: "video",
          video_url: inboundShare.payload?.video_url || "",
          video_filename: inboundShare.payload?.video_filename,
          video: inboundShare.payload?.video,
        };
      } else if (inboundShare.kind === "voice") {
        normalized = {
          kind: "voice",
          voice: inboundShare.payload?.voice || "",
          filename: inboundShare.payload?.filename || "",
          base64: inboundShare.payload?.base64,
        };
      }

      if (normalized) {
        setQueuedPayload(normalized);
        console.log("[RootLayout - Inbound] Queued inboundShare, waiting for user to select friend");
      }
    }
  }, [inboundShare, activeFriend, activeConnectionId, initialized]);



  // ✅ Fetch pending payload once on mount
  useEffect(() => {
    const checkOnce = async () => {
      try {
        const pending = await BashShareModule.getPendingShare();
        console.log("[RootLayout - Inbound] initial getPendingShare result:", pending);
        if (pending) {
          const parsed = JSON.parse(pending);
          let normalized;
          if (parsed.kind === "text") {
            normalized = { kind: "text", payload: { text: parsed.payload?.text || parsed.text || "" } };
          } else {
            normalized = parsed;
          }
          // Set into global store so inboundShare effect above reacts
          setInboundShare(normalized);
        }
      } catch (e) {
        console.log("[RootLayout - Inbound] Error fetching pending share:", e);
      }
    };

    checkOnce();
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

