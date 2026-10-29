import { useEffect, useEffectEvent } from "react";

const pixelsPerSecondPerStep = 7;

export function useAutoScroll(playing: boolean, speed: number, onEnd: () => void) {
  const end = useEffectEvent(onEnd);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    let position = window.scrollY;
    const tick = (now: number) => {
      if (scrolledByHer(position)) position = window.scrollY;
      position += ((now - last) / 1000) * speed * pixelsPerSecondPerStep;
      last = now;
      window.scrollTo(0, position);
      if (atTheEnd()) return end();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);
}

function scrolledByHer(position: number) {
  return Math.abs(window.scrollY - position) > 1;
}

function atTheEnd() {
  return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
}
