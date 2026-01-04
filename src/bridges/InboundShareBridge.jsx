// src/bridges/InboundShareBridge.jsx
import useGlobal from "@/src/core/global";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system";
import { File } from "expo-file-system"; // new File API in SDK 54
import { useEffect } from "react";
import { AppState, DeviceEventEmitter, NativeModules } from "react-native";

export default function InboundShareBridge({ onShare }) {  
  const addMessage = useGlobal((s) => s.addMessage);
  const BashShareModule = NativeModules.BashShareModule;  // ✅ correct reference

  useEffect(() => {
    console.log("[Inbound Share] JS listener mounted");

    let lastKey = null;

    const consume = async (raw) => {
      console.log("[Inbound Share] Event received:", raw, typeof raw);

      // De-duplication key
      const key =
        typeof raw === "string"
          ? raw
          : Array.isArray(raw)
          ? raw[0]
          : raw?.uri || String(raw);
      if (key && key === lastKey) {
        console.log("[Inbound Share] Duplicate event ignored");
        return;
      }
      lastKey = key;

      // Plain string → { text }
      if (typeof raw === "string") {
        const payload = { text: raw.trim() };
        onShare ? onShare(payload) : addMessage(payload);
        console.log("[Inbound Share] Payload:", payload);
        return;
      }

      // Array (SEND_MULTIPLE) → normalize first, or map if needed
      if (Array.isArray(raw)) {
        const first = raw[0];
        try {
          const payload = await toBashChatPayload(first);
          onShare ? onShare(payload) : addMessage(payload);
          console.log("[Inbound Share] Payload(array-first):", payload);
        } catch (e) {
          console.log("[Inbound Share] Error building payload from array:", e);
        }
        return;
      }

      // Wrapped nativeEvent
      if (raw && typeof raw === "object" && typeof raw.nativeEvent === "string") {
        const payload = { text: raw.nativeEvent.trim() };
        onShare ? onShare(payload) : addMessage(payload);
        console.log("[Inbound Share] Payload(nativeEvent):", payload);
        return;
      }

      if (!raw) return;
      try {
        const payload = await toBashChatPayload(raw);
        onShare ? onShare(payload) : addMessage(payload);
        console.log("[Inbound Share] Payload:", payload);
      } catch (e) {
        console.log("[Inbound Share] Error building payload:", e, "Raw:", raw);
      }
    };

    const subDevice = DeviceEventEmitter.addListener("onShareReceived", consume);

    // One-shot pulls of any queued share from native
    const pullOnce = async () => {
      try {
        const pending = await BashShareModule?.consumePendingShare?.();
        if (pending) {
          console.log("[Inbound Share] Pulled pending:", pending);
          await consume(pending);
        }
      } catch (e) {
        console.log("[Inbound Share] Error pulling pending:", e);
      }
    };

    // Immediate and timed retries to align with native 2-stage flushes
    pullOnce();                       // immediate
    const t1 = setTimeout(pullOnce, 2000); // aligns with 2.5s native flush
    const t2 = setTimeout(pullOnce, 5000); // aligns with 5s secondary flush

    // Foreground catch: if app becomes active after share, pull again
    const onAppState = (state) => {
      if (state === "active") pullOnce();
    };
    const appStateSub = AppState.addEventListener("change", onAppState);

    return () => {
      try { subDevice.remove(); } catch {}
      clearTimeout(t1);
      clearTimeout(t2);
      appStateSub?.remove?.();
    };


  }, [addMessage, onShare]);

  return null;
}

// --- Helpers ---

function inferMimeFromUri(uri) {
  const ext = uri?.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "mp4": return "video/mp4";
    case "mov": return "video/quicktime";
    case "m4a": return "audio/m4a";
    case "aac": return "audio/aac";
    case "mp3": return "audio/mpeg";
    case "wav": return "audio/wav";
    default: return undefined;
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
    console.log("[Share] Failed to load shared URI:", e);
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