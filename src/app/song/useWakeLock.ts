import { useEffect } from "react";

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    let done = false;
    const request = async () => {
      if (document.visibilityState !== "visible") return;
      lock = await navigator.wakeLock.request("screen").catch(() => undefined);
      if (done) void lock?.release();
    };
    void request();
    document.addEventListener("visibilitychange", request);
    return () => {
      done = true;
      document.removeEventListener("visibilitychange", request);
      void lock?.release();
    };
  }, [active]);
}
