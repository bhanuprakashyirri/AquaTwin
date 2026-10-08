"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Slim brand-green progress bar fixed to the top of the viewport — QuizCore's
 * signature replacement for the native scrollbar. rAF-throttled, hidden when
 * the page isn't scrollable.
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const update = () => {
      ticking.current = false;
      // The app may scroll on the viewport, on <body>, or on an inner container
      // depending on the page — read the position from whichever element is
      // actually scrolled, and measure against its own scrollable span.
      const se = document.scrollingElement ?? document.documentElement;
      const body = document.body;
      const spans = [
        se.scrollHeight - se.clientHeight,
        body.scrollHeight - body.clientHeight,
      ];
      const max = Math.max(...spans);
      const pos = Math.max(window.scrollY || 0, se.scrollTop || 0, body.scrollTop || 0);
      setProgress(max > 40 ? Math.min(100, Math.max(0, (pos / max) * 100)) : 0);
    };
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };
    update();
    // capture: true — scroll events don't bubble, but capture listeners on
    // window still observe them for inner scrolling containers.
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-[300] h-[3px]" aria-hidden>
      <div
        className="h-full rounded-r-full bg-brand transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
