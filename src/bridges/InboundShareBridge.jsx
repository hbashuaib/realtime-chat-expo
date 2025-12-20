// src/bridges/InboundShareBridge.jsx
import useGlobal from "@/src/core/global";
import * as FileSystem from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy"; // use legacy for copy/read
import { useEffect, useRef } from "react";
import ShareMenu from "react-native-share-menu";

// 👇 Define props type (JSX, so just inline)
export default function InboundShareBridge({ onShare }) {
  const handledInitialRef = useRef(false);
  const addMessage = useGlobal((s) => s.addMessage);

  useEffect(() => {
    const consume = async (item) => {
      if (!item) return;

      // Prevent double-handling on cold start
      if (!handledInitialRef.current) {
        handledInitialRef.current = true;
      }

      console.log("[Inbound Share] Raw item:", item);
      const payload = await toBashChatPayload(item);

      if (onShare) {
        onShare(payload);
      } else {
        addMessage(payload);
      }

      console.log("[Inbound Share] Payload:", payload);
    };

    // Cold start: app opened via share
    ShareMenu.getInitialShare(consume);

    // Runtime: new shares while app is open
    const listener = ShareMenu.addNewShareListener(consume);

    return () => listener.remove();
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
async function toBashChatPayload(item) {
  let mime = (item?.mimeType || "").toLowerCase();
  const uri = Array.isArray(item?.data) ? item.data[0] : item?.data;

  if (!mime && typeof uri === "string") {
    mime = inferMimeFromUri(uri) || "";
  }

  // Text
  if (
    mime === "text/plain" ||
    (typeof item?.data === "string" &&
      !mime.startsWith("image/") &&
      !mime.startsWith("video/") &&
      !mime.startsWith("audio/"))
  ) {
    return { text: String(item.data || "").trim() };
  }

  if (typeof uri !== "string" || uri.length === 0) {
    return { text: "[Unsupported share payload]" };
  }

  const filename = getFilenameFromUri(uri, "shared");

  let base64 = null;
  try {
    const cachePath = FileSystem.cacheDirectory + filename;
    await FileSystemLegacy.copyAsync({ from: uri, to: cachePath });
    base64 = await FileSystemLegacy.readAsStringAsync(cachePath, {
      encoding: FileSystem.EncodingType.Base64,
    });
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




// // src/bridges/InboundShareBridge.jsx
// import useGlobal from "@/src/core/global";
// import * as FileSystem from "expo-file-system";
// import * as FileSystemLegacy from "expo-file-system/legacy"; // use legacy for copy/read
// import { useEffect, useRef } from "react";
// import ShareMenu from "react-native-share-menu";

// // 👇 Define props type (JSX, so just inline)
// export default function InboundShareBridge({ onShare }) {
//   const handledInitialRef = useRef(false);
//   const addMessage = useGlobal((s) => s.addMessage);

//   useEffect(() => {
//     const consume = async (item) => {
//       if (!item) return;

//       // Prevent double-handling on cold start
//       if (!handledInitialRef.current) {
//         handledInitialRef.current = true;
//       }

//       console.log("[Inbound Share] Raw item:", item);
//       const payload = await toBashChatPayload(item);

//       if (onShare) {
//         onShare(payload);
//       } else {
//         addMessage(payload);
//       }

//       console.log("[Inbound Share] Payload:", payload);
//     };

//     // Cold start: app opened via share
//     ShareMenu.getInitialShare(consume);

//     // Runtime: new shares while app is open
//     const listener = ShareMenu.addNewShareListener(consume);

//     return () => listener.remove();
//   }, [addMessage, onShare]);

//   return null;
// }

// // --- Helpers ---

// function inferMimeFromUri(uri) {
//   const ext = uri?.split(".").pop()?.toLowerCase();
//   switch (ext) {
//     case "jpg":
//     case "jpeg": return "image/jpeg";
//     case "png": return "image/png";
//     case "gif": return "image/gif";
//     case "webp": return "image/webp";
//     case "mp4": return "video/mp4";
//     case "mov": return "video/quicktime";
//     case "m4a": return "audio/m4a";
//     case "aac": return "audio/aac";
//     case "mp3": return "audio/mpeg";
//     case "wav": return "audio/wav";
//     default: return undefined;
//   }
// }

// function getFilenameFromUri(uri, fallback = "share") {
//   try {
//     const last = uri.split("?")[0].split("/").pop();
//     return last || fallback;
//   } catch {
//     return fallback;
//   }
// }

// // Normalize shared item into your store payload
// async function toBashChatPayload(item) {
//   let mime = (item?.mimeType || "").toLowerCase();
//   const uri = Array.isArray(item?.data) ? item.data[0] : item?.data;

//   if (!mime && typeof uri === "string") {
//     mime = inferMimeFromUri(uri) || "";
//   }


//   // Text
//   if (
//     mime === "text/plain" ||
//     (typeof item?.data === "string" &&
//       !mime.startsWith("image/") &&
//       !mime.startsWith("video/") &&
//       !mime.startsWith("audio/"))
//   ) {
//     return { text: String(item.data || "") };
//   }
  
//   if (typeof uri !== "string" || uri.length === 0) {
//     return { text: "[Unsupported share payload]" };
//   }

//   const filename = getFilenameFromUri(uri, "shared");

//   let base64 = null;
//   try {
//     const cachePath = FileSystem.cacheDirectory + filename;
//     await FileSystemLegacy.copyAsync({ from: uri, to: cachePath });
//     base64 = await FileSystemLegacy.readAsStringAsync(cachePath, {
//       encoding: FileSystem.EncodingType.Base64,
//     });
//   } catch (e) {
//     console.log("[Share] Failed to load shared URI:", e);
//   }

//   if (!base64) {
//     return { text: "[Failed to load media]" };
//   }

//   if (mime.startsWith("image/")) {
//     return {
//       image: uri,
//       base64,
//       filename: filename, // changed from .endsWith(".jpg") ? filename : `${filename}.jpg`,
//     };
//   }
//   if (mime.startsWith("video/")) {
//     return {
//       video_url: uri,
//       video: base64,
//       video_filename: filename, // changed from .endsWith(".mp4") ? filename : `${filename}.mp4`,
//     };
//   }
//   if (mime.startsWith("audio/")) {
//     const audioExt = filename.split(".").pop().toLowerCase();
//     const safeName = ["m4a", "aac", "mp3", "wav"].includes(audioExt)
//       ? filename
//       : `${filename}.mp3`; // default to mp3 if unknown
//     return {
//       voice: uri,
//       base64,
//       filename: safeName,
//     };
//   }

//   return { text: uri };
// }





// // src/bridges/InboundShareBridge.jsx
// import useGlobal from "@/src/core/global";
// import * as FileSystem from "expo-file-system";
// import * as FileSystemLegacy from "expo-file-system/legacy"; // use legacy for copy/read
// import { useEffect, useRef } from "react";
// import { NativeEventEmitter, NativeModules } from "react-native";

// const { ShareMenu } = NativeModules;
// const shareMenuEmitter = new NativeEventEmitter(ShareMenu);

// // 👇 Define props type (JSX, so just inline)
// export default function InboundShareBridge({ onShare }) {
//   const handledInitialRef = useRef(false);
//   const addMessage = useGlobal((s) => s.addMessage);

//   useEffect(() => {
//     // Cold start: app opened via share
//     try {
//       ShareMenu.getSharedText(async (item) => {
//         console.log("[Inbound Share] Raw item from native:", item);
//         if (handledInitialRef.current) return;
//         handledInitialRef.current = true;
//         if (item) {
//           const payload = await toBashChatPayload(item);

//           // ✅ Call onShare if provided, else fallback to addMessage
//           if (onShare) {
//             onShare(payload);
//           } else {
//             addMessage(payload);
//           }

//           console.log("[Inbound Share] Initial payload:", payload);
//         }
//       });
//     } catch (e) {
//       console.warn("[Inbound Share] getSharedText error:", e);
//     }

//     // Runtime: new shares while app is open
//     const sub = shareMenuEmitter.addListener("NewShareEvent", async (item) => {
//       if (item) {
//         const payload = await toBashChatPayload(item);

//         if (onShare) {
//           onShare(payload);
//         } else {
//           addMessage(payload);
//         }

//         console.log("[Inbound Share] New payload:", payload);
//       }
//     });

//     return () => sub.remove();
//   }, [addMessage, onShare]);

//   return null;
// }


// // --- Helpers ---

// function inferMimeFromUri(uri) {
//   const ext = uri?.split(".").pop()?.toLowerCase();
//   switch (ext) {
//     case "jpg":
//     case "jpeg": return "image/jpeg";
//     case "png": return "image/png";
//     case "gif": return "image/gif";
//     case "webp": return "image/webp";
//     case "mp4": return "video/mp4";
//     case "mov": return "video/quicktime";
//     case "m4a": return "audio/m4a";
//     case "aac": return "audio/aac";
//     case "mp3": return "audio/mpeg";
//     case "wav": return "audio/wav";
//     default: return undefined;
//   }
// }

// function getFilenameFromUri(uri, fallback = "share") {
//   try {
//     const last = uri.split("?")[0].split("/").pop();
//     return last || fallback;
//   } catch {
//     return fallback;
//   }
// }

// // Normalize shared item into your store payload
// async function toBashChatPayload(item) {
//   const mime = (item?.mimeType || "").toLowerCase();

//   // Text
//   if (
//     mime === "text/plain" ||
//     (typeof item?.data === "string" &&
//       !mime.startsWith("image/") &&
//       !mime.startsWith("video/") &&
//       !mime.startsWith("audio/"))
//   ) {
//     return { text: String(item.data || "") };
//   }

//   const uri = Array.isArray(item?.data) ? item.data[0] : item?.data;
//   if (typeof uri !== "string" || uri.length === 0) {
//     return { text: "[Unsupported share payload]" };
//   }

//   const filename = getFilenameFromUri(uri, "shared");

//   let base64 = null;
//   try {
//     const cachePath = FileSystem.cacheDirectory + filename;
//     await FileSystemLegacy.copyAsync({ from: uri, to: cachePath });
//     base64 = await FileSystemLegacy.readAsStringAsync(cachePath, {
//       encoding: FileSystem.EncodingType.Base64,
//     });
//   } catch (e) {
//     console.log("[Share] Failed to load shared URI:", e);
//   }

//   if (!base64) {
//     return { text: "[Failed to load media]" };
//   }

//   if (mime.startsWith("image/")) {
//     return {
//       image: uri,
//       base64,
//       filename: filename.endsWith(".jpg") ? filename : `${filename}.jpg`,
//     };
//   }
//   if (mime.startsWith("video/")) {
//     return {
//       video_url: uri,
//       video: base64,
//       video_filename: filename.endsWith(".mp4") ? filename : `${filename}.mp4`,
//     };
//   }
//   if (mime.startsWith("audio/")) {
//     const audioExt = filename.split(".").pop().toLowerCase();
//     const safeName = ["m4a", "aac", "mp3", "wav"].includes(audioExt)
//       ? filename
//       : `${filename}.m4a`;
//     return {
//       voice: uri,
//       base64,
//       filename: safeName,
//     };
//   }

//   return { text: uri };
// }