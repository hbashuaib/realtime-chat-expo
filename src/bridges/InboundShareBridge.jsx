// src/bridges/InboundShareBridge.jsx
import useGlobal from "@/src/core/global";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system";
import { File } from "expo-file-system"; // new File API in SDK 54
import { useEffect } from "react";
import { AppState, NativeEventEmitter, DeviceEventEmitter,  NativeModules } from "react-native";

export default function InboundShareBridge({ onShare }) {
  const setInboundShare = useGlobal((s) => s.setInboundShare);

  let lastKey = null;

  const consume = async (raw) => {
    console.log("[Inbound Share] Event received:", raw, typeof raw);

    const key =
      typeof raw === "string"
        ? raw
        : Array.isArray(raw)
          ? JSON.stringify(raw[0])
          : raw?.uri || JSON.stringify(raw);

    lastKey = key;

    // If native emitted JSON string, parse and route directly
    if (typeof raw === "string") {
      let payload;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.kind) {
          if (parsed.kind === "text") {
            payload = {
              kind: "text",
              text: String(parsed.text || "").trim(),
            };
            lastKey = JSON.stringify(payload);
          } else {
            payload = { kind: "media", payload: parsed.payload || parsed }; lastKey = JSON.stringify(payload);}
          console.log("[Inbound Share] Payload(parsed):", parsed);
        }
      } catch {
        payload = { kind: "text", text: raw.trim() }; lastKey = JSON.stringify(payload);console.log("[Inbound Share] Payload(fallback-text):", payload);
      }

      /*__ONSHARE_NORMALIZED__*/ /*__ONSHARE_NORMALIZED__*/ /*__ONSHARE_NORMALIZED__*/ /*__ONSHARE_NORMALIZED__*/ 
      if (typeof onShare === "function") { console.log("[Inbound Share] Routed string payload to onShare:", payload); onShare(payload); } else { console.log("[Inbound Share] Routed string payload to global store:", payload); setInboundShare(payload); }
return;
    }

    if (Array.isArray(raw)) {
      const first = raw[0];
      try {
        const normalized = await toBashChatPayload(first);
        setInboundShare({ kind: "media", payload: normalized });
        console.log("[Inbound Share] Payload(array-first):", normalized);
        lastKey = JSON.stringify(normalized);
      } catch (e) {
        console.log("[Inbound Share] Error building payload from array:", e);
      }
      return;
    }

    if (raw && typeof raw === "object" && typeof raw.nativeEvent === "string") {
        const payload = { kind: "text", text: raw.nativeEvent.trim() };
        if (typeof onShare === "function") {
          console.log("[Inbound Share] Routed nativeEvent payload to onShare:", payload);
          onShare(payload);
        } else {
          console.log("[Inbound Share] Routed nativeEvent payload to global store:", payload);
          setInboundShare(payload);
        }
        console.log("[Inbound Share] Payload(nativeEvent):", payload);
        lastKey = JSON.stringify(payload);
        return;
      }

    if (!raw) return;
    try {
      const normalized = await toBashChatPayload(raw);
      setInboundShare({ kind: "media", payload: normalized });
      console.log("[Inbound Share] Payload:", normalized);
      lastKey = JSON.stringify(normalized);
    } catch (e) {
      console.log("[Inbound Share] Error building payload:", e, "Raw:", raw);
    }
  };

  // Delay logging until after mount so Catalyst is ready
  useEffect(() => {
    const BashShareModule = NativeModules.BashShareModule;

    setTimeout(() => {
      console.log("[Inbound Share] Bridge component mounted (delayed)");
      console.log(
        "[Inbound Share] BashShareModule full object:",
        BashShareModule,
      );
      console.log(
        "[Inbound Share] BashShareModule keys:",
        Object.keys(BashShareModule || {}),
      );
      console.log(
        "[Inbound Share] JS listener mounted - onShare prop:",
        typeof onShare,
      );

      // ✅ Test consumePendingShare immediately
      if (BashShareModule?.consumePendingShare) {
        BashShareModule.consumePendingShare()
          .then((res) =>
            console.log("[Inbound Share] consumePendingShare result:", res),
          )
          .catch((err) =>
            console.error("[Inbound Share] consumePendingShare error:", err),
          );
      }

      // ✅ Subscribe once
      // const emitter = new NativeEventEmitter(BashShareModule);
      
      // Use null instead of BashShareModule to bind globally
      // const emitter = new NativeEventEmitter(null);
      
      // ✅ Use DeviceEventEmitter directly
      const emitter = DeviceEventEmitter;

      const subModule = emitter.addListener("onShareReceived", async (raw) => {
        console.log("[Inbound Share] NativeEventEmitter fired with raw:", raw);
        await consume(raw);
      });

      // ✅ Pull retries
      const pullOnce = async (label) => {
        try {
          if (typeof BashShareModule.consumePendingShare !== "function") return;
          const pending = await BashShareModule.consumePendingShare();
          console.log(`[Inbound Share] Pull(${label}) pending:`, pending);
          if (pending) await consume(pending);
        } catch (e) {
          console.log(`[Inbound Share] Pull(${label}) error:`, e);
        }
      };

      setImmediate(() => {
        pullOnce("initial");
        setTimeout(() => pullOnce("2s"), 2000);
        setTimeout(() => pullOnce("5s"), 5000);
        setTimeout(() => pullOnce("8s"), 8000);
      });

      // const t1 = setTimeout(() => pullOnce("2s"), 2000);
      // const t2 = setTimeout(() => pullOnce("5s"), 5000);
      // const t3 = setTimeout(() => pullOnce("8s"), 8000);

      const appStateSub = AppState.addEventListener("change", (state) => {
        if (state === "active") pullOnce("foreground");
      });

      // return () => {
      //   subModule.remove();
      //   clearTimeout(t1);
      //   clearTimeout(t2);
      //   clearTimeout(t3);
      //   appStateSub?.remove?.();
      // };

      return () => {
        subModule.remove();
        appStateSub?.remove?.();
      };

    }, 1000);
  }, [setInboundShare, onShare]);

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

// Normalize shared item into your store payload
async function toBashChatPayload(data) {
  // Explicit early return for plain strings
  if (typeof data === "string") {
    console.log("[Inbound Share] toBashChatPayload returning text:", data.trim());
    return { text: data.trim() };
  }

  // If native emitted a plain string, treat it as text or URI
  const uri = Array.isArray(data) ? data[0] : data;
  let mime = "";

  if (typeof uri === "string") {
    mime = inferMimeFromUri(uri) || "";
  }

  // Text case: normalize to { text }
  if (
    mime === "text/plain" ||
    (typeof data === "string" &&
      !mime.startsWith("image/") &&
      !mime.startsWith("video/") &&
      !mime.startsWith("audio/"))
  ) {
    return { text: String(data || "").trim() };
  }

  // Empty/unsupported
  if (typeof uri !== "string" || uri.length === 0) {
    return { text: "[Unsupported share payload]" };
  }

  const filename = getFilenameFromUri(uri, "shared");

  let base64 = null;
  try {
    const cachePath = FileSystem.cacheDirectory + filename;

    if (/^https?:\/\//i.test(uri)) {
      // Remote URL → download using new File API
      const file = new File(cachePath);
      await file.downloadFileAsync(uri);
    } else {
      // Local content/file URI → copy
      const file = new File(uri);
      await file.copy(cachePath);
    }

    // Use new File API to read and encode
    const file = new File(cachePath);
    const buffer = await file.arrayBuffer();
    base64 = Buffer.from(buffer).toString("base64");
  } catch (e) {
    console.log("[Inbound Share] Failed to load shared URI:", e);
  }

  // Fallback: return URI-only payload if base64 failed
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

  // Base64 succeeded: return full payloads
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
