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

  const [shareConsumed, setShareConsumed] = useState(false);

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

  const handleInboundShare = useCallback(
    (payload: null | { kind: string; text?: string; uri?: string }) => {
      if (!payload || shareConsumed) return;
      setShareConsumed(true);

      if (!activeFriend || !activeConnectionId) {
        console.warn("[Inbound Share] No active chat context");
        router.replace("/(tabs)/Friends");
        return;
      }

      router.replace({
        pathname: "/Message",
        params: {
          id: String(activeConnectionId),
          friend: JSON.stringify(activeFriend),
        },
      });
    },
    [shareConsumed, activeFriend, activeConnectionId]
  );

  if (!initialized || !fontsLoaded) return null;

  return (
    <MenuProvider>
      <PaperProvider theme={currentTheme}>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        <InboundShareBridge onShare={handleInboundShare} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" />
          <Stack.Screen name="SignIn" />
          <Stack.Screen name="SignUp" />
          <Stack.Screen name="Message" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
      </PaperProvider>
    </MenuProvider>
  );
}







// // app/_layout.tsx
// import React, { useEffect, useCallback, useState } from "react";
// import { StatusBar } from "expo-status-bar";
// import { Stack, router } from "expo-router";
// import "react-native-reanimated";

// import { useFonts } from "expo-font";
// import { Provider as PaperProvider } from "react-native-paper";
// import { MenuProvider } from "react-native-popup-menu";
// import { ThemeProvider, DefaultTheme } from "@react-navigation/native";

// import { theme, ColorScheme } from "@/src/core/theme";
// import useGlobal from "@/src/core/global";
// import "@/src/core/fontawesome";
// import InboundShareBridge from "@/src/bridges/InboundShareBridge";

// export default function RootLayout() {
//   const colorScheme = (useGlobal((s) => s.themeMode) || "light") as ColorScheme;
//   const activeFriend = useGlobal((s) => s.activeFriend);
//   const activeConnectionId = useGlobal((s) => s.activeConnectionId);

//   const [shareConsumed, setShareConsumed] = useState(false);

//   const [fontsLoaded] = useFonts({
//     "LeckerliOne-Regular": require("@/src/assets/fonts/LeckerliOne-Regular.ttf"),
//     "MontserratExtraBold": require("@/src/assets/fonts/Montserrat-ExtraBold.ttf"),
//   });

//   const initialized = useGlobal((state) => state.initialized);
//   const init = useGlobal((state) => state.init);

//   useEffect(() => {
//     init();
//   }, [init]);

//   const currentTheme = theme[colorScheme];

//   const navigationTheme = {
//     ...DefaultTheme,
//     dark: colorScheme === "dark",
//     colors: {
//       ...DefaultTheme.colors,
//       primary: currentTheme.colors.primary,
//       background: currentTheme.colors.background,
//       card: currentTheme.colors.background,
//       text: currentTheme.colors.textPrimary,
//       border: currentTheme.colors.border,
//       notification: currentTheme.colors.primary,
//     },
//   };

//   const handleInboundShare = useCallback(
//     (payload: null | { kind: string; text?: string; uri?: string }) => {
//       if (!payload || shareConsumed) return;
//       setShareConsumed(true);

//       // If no active chat context, land the user on Friends within the tabs group
//       if (!activeFriend || !activeConnectionId) {
//         console.warn("[Inbound Share] No active chat context");
//         router.replace("/Friends");
//         return;
//       }

//       // Message is a root-level Stack screen — keep this
//       router.replace({
//         pathname: "/Message",
//         params: {
//           id: String(activeConnectionId),
//           friend: JSON.stringify(activeFriend),
//         },
//       });
//     },
//     [shareConsumed, activeFriend, activeConnectionId]
//   );

//   if (!initialized || !fontsLoaded) return null;

//   return (
//     <ThemeProvider value={navigationTheme}>
//       <MenuProvider>
//         <PaperProvider theme={currentTheme}>
//           <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
//           <InboundShareBridge onShare={handleInboundShare} />
//           <Stack screenOptions={{ headerShown: false }}>
//             <Stack.Screen name="Splash" />
//             <Stack.Screen name="SignIn" />
//             <Stack.Screen name="SignUp" />
//             {/* <Stack.Screen name="(tabs)" options={{ headerShown: false }} /> */}
//             <Stack.Screen name="Message" options={{ headerShown: false }} />
//             <Stack.Screen
//               name="modal"
//               options={{ presentation: "modal", title: "Modal" }}
//             />
//           </Stack>
//         </PaperProvider>
//       </MenuProvider>
//     </ThemeProvider>
//   );
// }

// // app/_layout.tsx
// import React, { useEffect, useCallback, useState } from 'react';
// import { StatusBar } from 'expo-status-bar';
// import { Stack, router } from 'expo-router';
// import 'react-native-reanimated';

// import { useFonts } from 'expo-font';
// import { Provider as PaperProvider } from 'react-native-paper';
// import { MenuProvider } from 'react-native-popup-menu';
// import { ThemeProvider, DefaultTheme } from '@react-navigation/native';

// import { theme } from '@/src/core/theme';
// import useGlobal from '@/src/core/global';
// import '@/src/core/fontawesome';
// import InboundShareBridge from "@/src/bridges/InboundShareBridge";

// export default function RootLayout() { 
//   // Subscribe root layout directly to global themeMode
//   const colorScheme = useGlobal((s) => s.themeMode); // 'light' | 'dark'
//   const [shareConsumed, setShareConsumed] = useState(false);
//   const { activeFriend, activeConnectionId } = useGlobal.getState();

//   console.log("RootLayout colorScheme:", colorScheme);

//   const [fontsLoaded] = useFonts({
//     'LeckerliOne-Regular': require('@/src/assets/fonts/LeckerliOne-Regular.ttf'),
//     'MontserratExtraBold': require('@/src/assets/fonts/Montserrat-ExtraBold.ttf'),
//   });

//   const initialized = useGlobal((state) => state.initialized);
//   const init = useGlobal((state) => state.init);

//   useEffect(() => {
//     init();
//   }, []); // Changed from [init] to []

//   // 👇 Guard mounting until init + fonts ready
//   if (!initialized || !fontsLoaded) return null;

//   // 👇 No assertion needed, hook guarantees 'light' | 'dark'
//   const currentTheme = theme[colorScheme as 'light' | 'dark'];

//   const navigationTheme = {
//     ...DefaultTheme,
//     dark: colorScheme === 'dark',
//     colors: {
//       ...DefaultTheme.colors,
//       primary: currentTheme.colors.primary,
//       background: currentTheme.colors.background,
//       card: currentTheme.colors.background,
//       text: currentTheme.colors.textPrimary,
//       border: currentTheme.colors.border,
//       notification: currentTheme.colors.primary,
//     },
//   };

//   // Inbound share handler
//   const handleInboundShare = useCallback((payload: null | {
//     kind: 'text' | 'uri' | 'multiple';
//     text?: string;
//     uri?: string;
//     uris?: string[];
//     mimeType?: string;
//   }) => {
//     if (!payload || shareConsumed) return;

//     setShareConsumed(true);
//     console.log('[Inbound Share] Routed:', payload);

//     // ✅ Route to a real screen, not "/"
//     // Option A: go to a message screen
//     //router.replace("/Message");
//     router.replace({
//       pathname: "/Message",
//       params: {
//         id: String(activeConnectionId),
//         friend: JSON.stringify(activeFriend),
//       }
//     });

//     // Option B: land on Friends tab
//     // router.replace("/Friends");
//   }, [shareConsumed]);


//   // const handleInboundShare = useCallback((payload: null | {
//   //   kind: 'text' | 'uri' | 'multiple';
//   //   text?: string;
//   //   uri?: string;
//   //   uris?: string[];
//   //   mimeType?: string;
//   // }) => {
//   //   if (!payload) return;

//   //   console.log('[Inbound Share] Routed:', payload);

//   //   // ✅ Navigate into your tab navigator root
//   //   router.replace("/"); // goes to app/(tabs)/index.tsx, which redirects to /Friends
//   //   // Or: router.replace("/Friends"); // if you want to land directly on Friends tab
//   // }, []);

//   return (
//     <MenuProvider>
//       <ThemeProvider value={navigationTheme}>
//         <PaperProvider>
//           <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
//           <InboundShareBridge onShare={handleInboundShare} />
//           <Stack screenOptions={{ headerShown: false }}>
//             <Stack.Screen name="Splash" />
//             <Stack.Screen name="SignIn" />
//             <Stack.Screen name="SignUp" />
//             <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
//             <Stack.Screen name="Message" options={{ headerShown: false }} />
//             <Stack.Screen
//               name="modal"
//               options={{ presentation: 'modal', title: 'Modal' }}
//             />
//           </Stack>
//         </PaperProvider>
//       </ThemeProvider>
//     </MenuProvider>
//   );
// }



// // app/_layout.tsx
// import React, { useEffect, useCallback } from 'react';
// import { StatusBar } from 'expo-status-bar';
// import { Stack } from 'expo-router';
// import 'react-native-reanimated';

// import { useFonts } from 'expo-font';
// import { Provider as PaperProvider } from 'react-native-paper';
// import { MenuProvider } from 'react-native-popup-menu';
// import { ThemeProvider, DefaultTheme } from '@react-navigation/native';

// //import { useColorScheme } from '@/hooks/use-color-scheme';
// import { theme } from '@/src/core/theme';
// import useGlobal from '@/src/core/global';
// import '@/src/core/fontawesome';
// import InboundShareBridge from "@/src/bridges/InboundShareBridge";


// export const unstable_settings = {
//   anchor: '(tabs)',
// };

// export default function RootLayout() { 
//   // Subscribe root layout directly to global themeMode
//   const colorScheme = useGlobal((s) => s.themeMode); // 'light' | 'dark'

//   console.log("RootLayout colorScheme:", colorScheme);

//   const [fontsLoaded] = useFonts({
//     'LeckerliOne-Regular': require('@/src/assets/fonts/LeckerliOne-Regular.ttf'),
//     'MontserratExtraBold': require('@/src/assets/fonts/Montserrat-ExtraBold.ttf'),
//   });

//   const initialized = useGlobal((state) => state.initialized);
//   const init = useGlobal((state) => state.init);

//   useEffect(() => {
//     init();
//   }, [init]);

//   // 👇 Guard mounting until init + fonts ready
//   if (!initialized || !fontsLoaded) return null;

//   // 👇 No assertion needed, hook guarantees 'light' | 'dark'
//   const currentTheme = theme[colorScheme as 'light' | 'dark'];

//   const navigationTheme = {
//     ...DefaultTheme,
//     dark: colorScheme === 'dark',
//     colors: {
//       ...DefaultTheme.colors,
//       primary: currentTheme.colors.primary,
//       background: currentTheme.colors.background,
//       card: currentTheme.colors.background,
//       text: currentTheme.colors.textPrimary,
//       border: currentTheme.colors.border,
//       notification: currentTheme.colors.primary,
//     },
//   };

//   // v5 inbound share handler
//   const handleInboundShare = useCallback((payload: null | {
//     kind: 'text' | 'uri' | 'multiple';
//     text?: string;
//     uri?: string;
//     uris?: string[];
//     mimeType?: string;
//   }) => {
//     if (!payload) return;

//     // TODO: route into BashChat state/actions
//     // Example: queue when no chat is active, or open composer with prefilled content
//     console.log('[Inbound Share] Routed:', payload);

//     // If you have a global store:
//     // const enqueueInbound = useGlobal.getState().enqueueInbound;
//     // enqueueInbound(payload);
//   }, []);



//   return (
//     <MenuProvider>
//       <ThemeProvider value={navigationTheme}>
//         <PaperProvider>
//           <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
//           <InboundShareBridge onShare={handleInboundShare} />
//           <Stack screenOptions={{ headerShown: false }}>
//             <Stack.Screen name="Splash" />
//             <Stack.Screen name="SignIn" />
//             <Stack.Screen name="SignUp" />
//             <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
//             <Stack.Screen name="Message" options={{ headerShown: false }} />
//             <Stack.Screen
//               name="modal"
//               options={{ presentation: 'modal', title: 'Modal' }}
//             />
//           </Stack>
//         </PaperProvider>
//       </ThemeProvider>
//     </MenuProvider>
//   );
// }

