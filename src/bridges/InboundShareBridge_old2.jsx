// src/bridges/InboundShareBridge.jsx
import useGlobal from "@/src/core/global";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system";
import { File } from "expo-file-system"; // new File API in SDK 54
import { useEffect } from "react";
import { AppState, DeviceEventEmitter, NativeModules } from "react-native";

export default function InboundShareBridge({ onShare }) {
  // const addMessage = useGlobal((s) => s.addMessage);
  const setInboundShare = useGlobal((s) => s.setInboundShare);

  const BashShareModule = NativeModules.BashShareModule; // ✅ correct reference

  useEffect(() => {
    console.log("[Inbound Share] JS listener mounted");

    let lastKey = null;
    let lastSeen = 0;

    const consume = async (raw) => {
      console.log("[Inbound Share] Event received:", raw, typeof raw);

      // De-duplication key (stringify for stronger comparison)
      const key =
        typeof raw === "string"
          ? raw
          : Array.isArray(raw)
            ? JSON.stringify(raw[0])
            : raw?.uri || JSON.stringify(raw);

      // if (key && key === lastKey && Date.now() - lastSeen < 500) {
      //   console.log("[Inbound Share] Duplicate event ignored (same tick)");
      //   return;
      // }
      // lastKey = key;
      // lastSeen = Date.now(); // mark consumed using the same key used for comparison

      if (key && key === lastKey) {
        console.log("[Inbound Share] Duplicate event ignored");
        return;
      }
      lastKey = key;

      // If native emitted JSON string, parse and route directly
      if (typeof raw === "string") {
        let payload;
        try {
          const parsed = JSON.parse(raw);
          // if (parsed && typeof parsed === "object" && parsed.kind) {
          //   // ✅ Drop stale payload if a newer one is already queued
          //   const rawKey = JSON.stringify(parsed);
          //   if (lastKey && lastKey !== rawKey) {
          //     console.log("[Inbound Share] Dropping stale payload:", parsed);
          //     return;
          //   }
          //   lastKey = rawKey;

          //   if (parsed.kind === "text") {
          //     payload = {
          //       kind: "text",
          //       text: String(parsed.text || "").trim(),
          //     };
          //   } else {
          //     payload = { kind: "media", payload: parsed.payload || parsed }; lastKey = JSON.stringify(payload); lastKey = JSON.stringify(payload); lastKey = JSON.stringify(payload); lastKey = JSON.stringify(payload); lastKey = JSON.stringify(payload); lastKey = JSON.stringify(payload);
          //   }
          //   console.log("[Inbound Share] Payload(parsed):", parsed);
          // }
          if (parsed && typeof parsed === "object" && parsed.kind) {
            if (parsed.kind === "text") {
              payload = {
                kind: "text",
                text: String(parsed.text || "").trim(),
              };
              lastKey = JSON.stringify(payload); // ✅ mark text payload as consumed
            } else {
              payload = { kind: "media", payload: parsed.payload || parsed };
              lastKey = JSON.stringify(payload);
              lastKey = JSON.stringify(payload); // ✅ mark media payload as consumed
            }
            console.log("[Inbound Share] Payload(parsed):", parsed);
          }
        } catch {
          // Not JSON → fallback to plain text
          payload = { kind: "text", text: raw.trim() };
          lastKey = JSON.stringify(payload);
          lastKey = JSON.stringify(payload); // ✅ mark fallback text as consumed
          console.log("[Inbound Share] Payload(fallback-text):", payload);
        }
        // if (typeof onShare === "function") { onShare(payload); } else { setInboundShare(payload); }

        // if (typeof onShare === "function") {
        //   onShare(payload);
        // } else {
        //   if (typeof onShare === "function") {
        //     onShare(payload);
        //   } else {
        //     if (typeof onShare === "function") { onShare(payload); } else { setInboundShare(payload); }
        //   }
        // }

        if (typeof onShare === "function") {
          onShare(payload);
        } else {
          if (typeof onShare === "function") {
            onShare(payload);
          } else {
            setInboundShare(payload);
          }
        }

        return;
      }

      // Array (SEND_MULTIPLE) → normalize first, or map if needed
      if (Array.isArray(raw)) {
        const first = raw[0];
        try {
          const normalized = await toBashChatPayload(first);
          setInboundShare({ kind: "media", payload: normalized });
          console.log("[Inbound Share] Payload(array-first):", normalized);
          lastKey = JSON.stringify(normalized); // ✅ mark array payload as consumed
        } catch (e) {
          console.log("[Inbound Share] Error building payload from array:", e);
        }
        return;
      }

      // Wrapped nativeEvent
      if (
        raw &&
        typeof raw === "object" &&
        typeof raw.nativeEvent === "string"
      ) {
        const payload = { kind: "text", text: raw.nativeEvent.trim() };
        // if (typeof onShare === "function") { onShare(payload); } else { setInboundShare(payload); }

        if (typeof onShare === "function") {
          onShare(payload);
        } else {
          if (typeof onShare === "function") {
            onShare(payload);
          } else {
            if (typeof onShare === "function") {
              onShare(payload);
            } else {
              setInboundShare(payload);
            }
          }
        }

        console.log("[Inbound Share] Payload(nativeEvent):", payload);
        lastKey = JSON.stringify(payload); // ✅ mark nativeEvent payload as consumed
        return;
      }

      // Single item → normalize
      if (!raw) return;
      try {
        const normalized = await toBashChatPayload(raw);
        setInboundShare({ kind: "media", payload: normalized });
        console.log("[Inbound Share] Payload:", normalized);
        lastKey = JSON.stringify(normalized); // ✅ mark media payload as consumed
      } catch (e) {
        console.log("[Inbound Share] Error building payload:", e, "Raw:", raw);
      }
    };

    // const subDevice = DeviceEventEmitter.addListener(
    //   "onShareReceived",
    //   consume,
    // );

    // const subDevice = DeviceEventEmitter.addListener(
    //   "onShareReceived",
    //   (payload) => {
    //     console.log(">>> [Inbound Share] Received raw payload:", payload);
    //     consume(payload);
    //   },
    // );

    const subDevice = DeviceEventEmitter.addListener(
      "onShareReceived",
      consume,
    );

    // // ✅ Use NativeEventEmitter bound to BashShareModule
    // const eventEmitter = new NativeEventEmitter(BashShareModule);
    // const subDevice = eventEmitter.addListener("onShareReceived", consume);

    console.log("[Inbound Share] Listener subscribed to onShareReceived");

    // One-shot pulls of any queued share from native
    const pullOnce = async (label) => {
      try {
        const pending = await BashShareModule?.consumePendingShare?.();
        console.log(`[Inbound Share] Pull(${label}) pending:`, pending);
        if (pending) {
          console.log("[Inbound Share] Pulled pending:", pending);
          await consume(pending);
          // ✅ Update dedup key to latest
          lastKey = JSON.stringify(pending);
        }
      } catch (e) {
        console.log(`[Inbound Share] Pull(${label}) error:`, e);
      }
    };

    // Immediate and timed retries to align with native 2-stage flushes
    pullOnce("immediate"); // immediate
    const t1 = setTimeout(() => pullOnce("2s"), 2000);
    const t2 = setTimeout(() => pullOnce("5s"), 5000);
    const t3 = setTimeout(() => pullOnce("8s"), 8000);

    // Foreground catch: if app becomes active after share, pull again
    // const onAppState = (state) => {
    //   if (state === "active") pullOnce();
    // };
    // const appStateSub = AppState.addEventListener("change", onAppState);

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") pullOnce("foreground");
    });

    return () => {
      try {
        subDevice.remove();
      } catch {}
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      appStateSub?.remove?.();
    };
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
