// app.config.js
export default {
  expo: {
    name: "BashChat",
    slug: "realtime-chat-expo",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",

    // ✅ Single source of truth for deep linking
    scheme: "realtimechatexpo",

    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
    },

    android: {
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.anonymous.realtimechatexpo",

      // Keep your current permissions (unchanged for minimal risk)
      permissions: [
        "CAMERA",
        "INTERNET",
        "MODIFY_AUDIO_SETTINGS",
        "READ_EXTERNAL_STORAGE",
        "RECORD_AUDIO",
        "SYSTEM_ALERT_WINDOW",
        "VIBRATE",
        "WRITE_EXTERNAL_STORAGE",
      ],

      // ❌ No intentFilters here — Expo will auto-generate VIEW filters from 'scheme'
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: { backgroundColor: "#000000" },
        },
      ],
      "expo-secure-store",
      "expo-font",
      "expo-video",
      "expo-web-browser",
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 24,
          },
        },
      ],
      "./app.plugin.js",
      "./plugins/withShareMenuFix.js",
      "./plugins/withGradlePropertiesFix.js",
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      router: {},
      eas: {
        projectId: "d67f534b-7c54-4654-a084-f03894ebb851",
      },
    },
  },
};