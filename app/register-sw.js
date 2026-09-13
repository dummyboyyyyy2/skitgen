"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — the app still works fully without offline/installability.
    });

    // A tab left open across a deploy keeps running under the OLD service
    // worker until a new one takes control. Reload once when that happens
    // so the tab picks up the new version instead of appearing stuck.
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);
  return null;
}
