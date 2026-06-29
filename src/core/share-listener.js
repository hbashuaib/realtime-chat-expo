// src/core/share-listener.js
import { NativeModules, NativeEventEmitter } from "react-native";
import { globalStore } from "@/src/core/global";

console.log("[Global Share Listener] Attached at startup"); // ✅ Debugging step

const { BashShareModule } = NativeModules;

// ✅ Only attach if module exists
if (BashShareModule) {
  console.log("[Global Share Listener] BashShareModule detected"); // ✅ Debugging step

  const BashShareEmitter = new NativeEventEmitter(BashShareModule);

  BashShareEmitter.addListener("onShareReceived", (res) => {
    console.log("[Global Share Listener] onShareReceived received:", res);

    try {
      const parsed = JSON.parse(res);
      globalStore.getState().setInboundShare(
        parsed.kind === "text"
          ? { kind: "text", payload: { text: parsed.payload?.text || parsed.text || "" } }
          : parsed
      );
    } catch {
      globalStore.getState().setInboundShare({ kind: "text", payload: { text: String(res) } });
    }

    // ❌ Do not consume native queue here
    // ✅ Let MessageScreen call getAndConsumePendingShare() after sending
  });

  // ✅ Startup peek only checks, does not set inboundShare again
  (async () => {
    try {
      const res = await BashShareModule.peekPendingShare?.();
      console.log("[Global Share Listener] startup peek result:", res);
      if (res) {
        try {
          const parsed = JSON.parse(res);
          globalStore.getState().setInboundShare(
            parsed.kind === "text"
              ? { kind: "text", payload: { text: parsed.payload?.text || parsed.text || "" } }
              : parsed
          );
        } catch {
          globalStore.getState().setInboundShare({ kind: "text", payload: { text: String(res) } });
        }
      }
    } catch (e) {
      console.warn("[Global Share Listener] peekPendingShare failed:", e);
    }
  })();
} else {
  console.warn("[Global Share Listener] BashShareModule not available yet");
}
