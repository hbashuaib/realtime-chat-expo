// src/bridges/DebugSharePing.jsx
import { useEffect } from "react";
import BashShareModule from "bash-share-module";
// import { NativeModules } from "react-native";

// const { BashShareModule } = NativeModules;

export default function DebugSharePing() {
  useEffect(() => {
    (async () => {
      try {
        const res = await BashShareModule.ping();
        console.log("[DebugSharePing] Ping result:", res);
      } catch (err) {
        console.error("[DebugSharePing] Ping error:", err);
      }
    })();
  }, []);

  return null; // no UI, just logs
}
