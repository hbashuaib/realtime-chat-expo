import { useEffect } from "react";
import ShareMenu from "react-native-share-menu";
import useGlobal from "@/src/core/global";

export default function InboundShareBridge() {
  useEffect(() => {
    // Listen for new shares while app is running
    const sub = ShareMenu.addNewShareListener((item) => {
      if (!item) return;
      console.log("[Inbound Share] Received:", item);
      useGlobal.getState().setInboundShare(item); // store in global state
    });

    // Handle share that launched the app (cold start)
    ShareMenu.getInitialShare()
      .then((item) => {
        if (!item) return;
        console.log("[Inbound Share] Initial:", item);
        useGlobal.getState().setInboundShare(item);
      })
      .catch((e) => console.log("[Inbound Share] getInitialShare error:", e));

    return () => {
      ShareMenu.clearListeners();
      sub?.remove?.();
    };
  }, []);

  return null;
}