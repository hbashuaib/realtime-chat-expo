// src/bridges/InboundShareBridge.jsx
import useGlobal from "@/src/core/global";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system";
import { File } from "expo-file-system"; // new File API in SDK 54
import { useEffect } from "react";
import { NativeEventEmitter, NativeModules, DeviceEventEmitter } from "react-native";

export default function InboundShareBridge({ onShare }) {  
  const addMessage = useGlobal((s) => s.addMessage);

  useEffect(() => {
    console.log("[Inbound Share] JS listener mounted");

    const consume = async (raw) => {
      // Defensive: log everything that arrives
      console.log("[Inbound Share] Event received:", raw, typeof raw);

      // Strings → { text }
      if (typeof raw === "string") {
        const payload = { text: raw.trim() };
        if (onShare) { onShare(payload); } else { addMessage(payload); }
        console.log("[Inbound Share] Payload:", payload);
        return;
      }

      // Guard: some RN bridges wrap values as { nativeEvent: ... }
      if (raw && typeof raw === "object" && typeof raw.nativeEvent === "string") {
        const payload = { text: raw.nativeEvent.trim() };
        if (onShare) { onShare(payload); } else { addMessage(payload); }
        console.log("[Inbound Share] Payload(nativeEvent):", payload);
        return;
      }

      // Fallback to full normalization
      if (!raw) return;
      console.log("[Inbound Share] Raw data:", raw);
      try {
        const payload = await toBashChatPayload(raw);
        if (onShare) { onShare(payload); } else { addMessage(payload); }
        console.log("[Inbound Share] Payload:", payload);
      } catch (e) {
        console.log("[Inbound Share] Error building payload:", e, "Raw:", raw);
      }
    };

    // Canonical binding: listen only via NativeEventEmitter(DeviceEventManagerModule)
    const nativeEmitter = new NativeEventEmitter(NativeModules.DeviceEventManagerModule);
    const subNative = nativeEmitter.addListener("onShareReceived", consume);

    return () => {
      try { subNative.remove(); } catch {}
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