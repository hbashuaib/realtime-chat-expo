// src/bridges/InboundShareBridge.jsx
import useGlobal from "@/src/core/global";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system";
import { File } from "expo-file-system"; // new File API in SDK 54
import { useEffect } from "react";
// import BashShareModule, { BashShareEmitter } from "bash-share-module";
import { NativeModules, NativeEventEmitter } from "react-native";

// const { BashShareModule } = NativeModules;
// export const BashShareEmitter = new NativeEventEmitter(BashShareModule);
const { BashShareModule } = NativeModules;
const BashShareEmitter = new NativeEventEmitter(BashShareModule);


export default function InboundShareBridge({ onShare }) {
  const setInboundShare = useGlobal((s) => s.setInboundShare);
  let lastKey = null;

  const consume = async (raw) => {
    console.log("[Inbound Share] Event received:", raw, typeof raw);

    let payload;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.kind) {
          if (parsed.kind === "text") {
            const textValue = parsed.text || parsed.payload?.text || "";
            payload = { kind: "text", text: String(textValue).trim() };
          } else {
            payload = { kind: "media", payload: parsed.payload || parsed };
          }
          console.log("[Inbound Share] Payload(parsed):", parsed);
        }
      } catch {
        payload = { kind: "text", text: raw.trim() };
        console.log("[Inbound Share] Payload(fallback-text):", payload);
      }
    } else if (Array.isArray(raw)) {
      try {
        const normalized = await toBashChatPayload(raw[0]);
        payload = { kind: "media", payload: normalized };
        console.log("[Inbound Share] Payload(array-first):", normalized);
      } catch (e) {
        console.log("[Inbound Share] Error building payload from array:", e);
      }
    } else if (raw && typeof raw === "object" && typeof raw.nativeEvent === "string") {
      payload = { kind: "text", text: raw.nativeEvent.trim() };
      console.log("[Inbound Share] Payload(nativeEvent):", payload);
    } else if (raw && typeof raw === "object" && raw.kind) {
      // Already a normalized payload from native
      payload = raw;
      console.log("[Inbound Share] Payload(object):", payload);
    } else if (raw) {
      try {
        const normalized = await toBashChatPayload(raw);
        payload = { kind: "media", payload: normalized };
        console.log("[Inbound Share] Payload:", normalized);
      } catch (e) {
        console.log("[Inbound Share] Error building payload:", e, "Raw:", raw);
      }
    }

    if (!payload) return;

    // Track last timestamp instead of payload content
    const now = Date.now();
    if (lastKey && now - lastKey < 2000) {
      console.log("[Inbound Share] Ignored rapid duplicate");
    } else {
      lastKey = now;
      if (typeof onShare === "function") {
        console.log("[Inbound Share] Routed payload to onShare:", payload);
        onShare(payload);
      } else {
        console.log("[Inbound Share] Routed payload to global store:", payload);
        setInboundShare(payload);
      }
    }  
    
  };

  useEffect(() => {
    console.log("[Inbound Share] Bridge mounted");
    console.log("[Debug] BashShareModule keys:", Object.keys(BashShareModule)); // ✅ should show ping, peekPendingShare, etc.
    console.log("[Debug] BashShareEmitter keys:", Object.keys(BashShareEmitter));
    console.log("[Debug] NativeModules.BashShareModule keys:", Object.keys(NativeModules.BashShareModule || {}));

    let lastPayload = null;

    // Subscribe directly to BashShareEmitter
    const subscription = BashShareEmitter.addListener("onShareReceived", async (raw) => {
      console.log("[Inbound Share] BashShareEmitter fired with raw:", raw, typeof raw);
      console.log("[Inbound Share] BashShareEmitter fired with raw:", JSON.stringify(raw));

      if (raw) {
        await consume(raw);
      }
    });

    console.log("[Inbound Share] Listener attached at", Date.now());
    
    // 🔎 Immediately check queue for missed payloads
    (async () => {
      try {
        // Always consume once after mount to catch missed events
        const pending = await BashShareModule.consumePendingShare();
        if (pending) {
          console.log("[Inbound Share] Found pending after mount (consume):", pending);
          await consume(pending);
        } else {
          console.log("[Inbound Share] No pending share after mount");
        }
      } catch (e) {
        console.error("[Inbound Share] Error checking queue after mount:", e);
      }
    })();


    // Debug: list all native modules
    console.log("[Debug] NativeModules keys:", Object.keys(NativeModules));

    // Debug: test each BashShareModule method directly
    (async () => {
      try {
        // Debug: test each BashShareModule method directly
        if (BashShareModule?.ping) {
          const res = await BashShareModule.ping();
          console.log("[Debug] Ping result:", res);
        }
        if (BashShareModule?.peekPendingShare) {
          const peek = await BashShareModule.peekPendingShare();
          console.log("[Debug] Peek result:", peek);
        }
        if (BashShareModule?.consumePendingShare) {
          const consumed = await BashShareModule.consumePendingShare();
          console.log("[Debug] Consume result:", consumed);
        }
        if (BashShareModule?.flushPendingShare) {
          await BashShareModule.flushPendingShare();
          console.log("[Debug] Flush called successfully");
        }
        // if (BashShareModule?.notifyShareReceived) {
        //   BashShareModule.notifyShareReceived("test-payload");
        //   console.log("[Debug] notifyShareReceived called successfully");
        // }

        // Fallback consume at mount
        const pending = await BashShareModule?.consumePendingShare?.();
        if (pending && pending !== lastPayload) {
          console.log("[Inbound Share] Fallback consume found:", pending);
          lastPayload = pending;
          await consume(pending);
        } else {
          console.log("[Inbound Share] No pending share at mount");
        }
      } catch (e) {
        console.error("[Inbound Share] Fallback consume error:", e);
      }
    })();

    if (BashShareModule?.ping) {
      BashShareModule.ping()
        .then(res => console.log("[Debug] Ping result:", res))
        .catch(err => console.error("[Debug] Ping error:", err));
    }

    return () => {
      subscription.remove();
    };
  }, [setInboundShare, onShare]);

  return null;
}

// ✅ Minimal test listener component
export function DebugShareListener() {
  useEffect(() => {
    const sub = BashShareEmitter.addListener("onShareReceived", (raw) => {
      console.log("[DebugShareListener] Got event:", raw, typeof raw);
    });
    return () => sub.remove();
  }, []);

  return null;
}

// --- Helpers ---
function inferMimeFromUri(uri) {
  const ext = uri?.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "m4a":
      return "audio/m4a";
    case "aac":
      return "audio/aac";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    default:
      return undefined;
  }
}

function getFilenameFromUri(uri, fallback = "share") {
  try {
    const last = uri.split("?")[0].split("/").pop();
    return last || fallback;
  } catch {
    return fallback;
  }
}

async function toBashChatPayload(data) {
  if (typeof data === "string") {
    console.log("[Inbound Share] toBashChatPayload returning text:", data.trim());
    return { text: data.trim() };
  }

  const uri = Array.isArray(data) ? data[0] : data;
  let mime = "";

  if (typeof uri === "string") {
    mime = inferMimeFromUri(uri) || "";
  }

  if (
    mime === "text/plain" ||
    (typeof data === "string" &&
      !mime.startsWith("image/") &&
      !mime.startsWith("video/") &&
      !mime.startsWith("audio/"))
  ) {
    return { text: String(data || "").trim() };
  }

  if (typeof uri !== "string" || uri.length === 0) {
    return { text: "[Unsupported share payload]" };
  }

  const filename = getFilenameFromUri(uri, "shared");
  let base64 = null;

  try {
    const cachePath = FileSystem.cacheDirectory + filename;

    if (/^https?:\/\//i.test(uri)) {
      const file = new File(cachePath);
      await file.downloadFileAsync(uri);
    } else {
      const file = new File(uri);
      await file.copy(cachePath);
    }

    const file = new File(cachePath);
    const buffer = await file.arrayBuffer();
    base64 = Buffer.from(buffer).toString("base64");
  } catch (e) {
    console.log("[Inbound Share] Failed to load shared URI:", e);
  }

  if (!base64) {
    if (mime.startsWith("image/")) {
      return { image: uri, filename };
    }
    if (mime.startsWith("video/")) {
      return { video_url: uri, video_filename: filename };
    }
    if (mime.startsWith("audio/")) {
      const audioExt = filename.split(".").pop()?.toLowerCase() || "";
      const safeName = ["m4a", "aac", "mp3", "wav"].includes(audioExt)
        ? filename
        : `${filename}.mp3`;
      return { voice: uri, filename: safeName };
    }
    return { text: uri };
  }

  if (mime.startsWith("image/")) {
    return { image: uri, base64, filename };
  }
  if (mime.startsWith("video/")) {
    return { video_url: uri, video: base64, video_filename: filename };
  }
  if (mime.startsWith("audio/")) {
    const audioExt = filename.split(".").pop()?.toLowerCase() || "";
    const safeName = ["m4a", "aac", "mp3", "wav"].includes(audioExt)
      ? filename
      : `${filename}.mp3`;
    return { voice: uri, base64, filename: safeName };
  }

  return { text: uri };
}