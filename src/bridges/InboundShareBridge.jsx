// src/bridges/InboundShareBridge.jsx
// InboundShareBridge.jsx (v5-compatible)
import React, { useEffect, useRef } from "react";
import { NativeModules, NativeEventEmitter } from "react-native";

const { ShareMenu } = NativeModules;
const shareMenuEmitter = new NativeEventEmitter(ShareMenu);

export default function InboundShareBridge({ onShare }) {
  const handledInitialRef = useRef(false);

  console.log("[InboundShareBridge] Mounted, attaching listeners");

  useEffect(() => {
    // Cold-start: v5 callback API
    try {
      ShareMenu.getSharedText((item) => {
        if (handledInitialRef.current) return;
        handledInitialRef.current = true;

        if (item) {
          // item: { mimeType, data } or an array for SEND_MULTIPLE
          logShare("[Inbound Share] Initial", item);
          safelyHandle(onShare, item);
        }
      });
    } catch (e) {
      console.warn("[Inbound Share] getSharedText error:", e);
    }

    // Runtime shares: listen for v5 DeviceEvent "NewShareEvent"
    const subscription = shareMenuEmitter.addListener("NewShareEvent", (item) => {
      if (item) {
        logShare("[Inbound Share] New event", item);
        safelyHandle(onShare, item);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [onShare]);

  return null;
}

// Helpers

function safelyHandle(handler, item) {
  try {
    handler?.(normalizeItem(item));
  } catch (e) {
    console.warn("[Inbound Share] onShare handler error:", e);
  }
}

// Normalize shape to keep your app logic clean
function normalizeItem(item) {
  // v5 returns:
  // - Single: { mimeType: string, data: string }
  // - Multiple: { mimeType: string, data: [string, ...] }
  if (!item) return null;

  const { mimeType, data } = item;

  if (Array.isArray(data)) {
    return { kind: "multiple", mimeType, uris: data };
  }

  if (mimeType === "text/plain") {
    return { kind: "text", text: data };
  }

  // Common media types: image/*, audio/*, video/*
  return { kind: "uri", mimeType, uri: data };
}

function logShare(prefix, item) {
  try {
    console.log(prefix + ":", item);
  } catch {}
}