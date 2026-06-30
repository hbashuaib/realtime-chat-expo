// src/core/share-listener.js
import { NativeModules, NativeEventEmitter } from "react-native";
import { globalStore } from "@/src/core/global";

console.log("[Global Share Listener] Attached at startup"); // ✅ Debugging step

const { BashShareModule } = NativeModules;

// ✅ Only attach if module exists
if (BashShareModule) {
  console.log("[Global Share Listener] BashShareModule detected");

  const BashShareEmitter = new NativeEventEmitter(BashShareModule);

  // ✅ Event listener for live shares
  BashShareEmitter.addListener("onShareReceived", (res) => {
    if (!res || res === "emitted" || res === "nothing") {
      console.log("[Global Share Listener] Ignored marker string:", res);
      return;
    }

    console.log("[Global Share Listener] onShareReceived fired with raw:", res, typeof res);

    let payload;
    try {
      const parsed = JSON.parse(res);
      payload =
        parsed.kind === "text"
          ? { kind: "text", payload: { text: parsed.payload?.text || parsed.text || "" } }
          : parsed;
      console.log("[Global Share Listener] Parsed payload:", parsed);
    } catch {
      payload = { kind: "text", payload: { text: String(res) } };
      console.log("[Global Share Listener] Fallback text payload:", payload);
    }

    // ✅ Persist inboundShare until MessageScreen consumes it
    globalStore.getState().setInboundShare(payload);
    console.log("[Global Share Listener] InboundShare set in global store");
  });

  // ✅ Startup flush for cold start
  (async () => {
    try {
      console.log("[Global Share Listener] Performing startup flushPendingShare...");
      const res = await BashShareModule.flushPendingShare?.();
      console.log("[Global Share Listener] startup flush result:", res, typeof res);

      if (res && res !== "nothing" && res !== "emitted") {
        let payload;
        try {
          const parsed = JSON.parse(res);
          payload =
            parsed.kind === "text"
              ? { kind: "text", payload: { text: parsed.payload?.text || parsed.text || "" } }
              : parsed;
          console.log("[Global Share Listener] Parsed startup payload:", parsed);
        } catch {
          payload = { kind: "text", payload: { text: String(res) } };
          console.log("[Global Share Listener] Startup fallback text payload:", payload);
        }

        globalStore.getState().setInboundShare(payload);
        console.log("[Global Share Listener] Startup inboundShare set in global store");
      } else {
        console.log("[Global Share Listener] No usable pending share at startup");
      }
    } catch (e) {
      console.warn("[Global Share Listener] flushPendingShare threw exception:", e);
    }
  })();
} else {
  console.warn("[Global Share Listener] BashShareModule not available yet");
}