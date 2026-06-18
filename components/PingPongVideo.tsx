'use client';

import { useEffect, useRef } from 'react';

type Props = {
  src: string;
  className?: string;
};

/**
 * A video element that ping-pongs — plays forward, then plays backward by
 * manually scrubbing `currentTime` via requestAnimationFrame (browsers don't
 * reliably support negative `playbackRate`).
 *
 * Critically, we DON'T wait for the `ended` event to start reversing — that
 * causes a visible freeze of half-a-second to a few seconds, because browsers
 * fire `ended` only AFTER the last frame has been on screen for a beat. We
 * watch `timeupdate` and pivot to reverse ~200ms before natural end so the
 * transition is seamless. `ended` is kept as a fallback safety net.
 */
export function PingPongVideo({ src, className = '' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let direction: 1 | -1 = 1;
    let rafId: number | null = null;
    let lastTimestamp: number | null = null;

    // How early (in seconds) before the natural end we pivot to reverse.
    // 0.2s is enough to avoid the browser's end-of-video freeze while still
    // playing nearly the entire forward video.
    const PIVOT_BUFFER_S = 0.2;

    function reverseFrame(timestamp: number) {
      if (!video || direction !== -1) return;

      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }
      const dt = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      const newTime = video.currentTime - dt;

      if (newTime <= 0) {
        video.currentTime = 0;
        lastTimestamp = null;
        direction = 1;
        video.play().catch(() => {
          /* autoplay can fail silently in some browsers */
        });
        return;
      }

      video.currentTime = newTime;
      rafId = requestAnimationFrame(reverseFrame);
    }

    function startReverse() {
      if (!video || direction !== 1) return;
      direction = -1;
      lastTimestamp = null;
      video.pause();
      rafId = requestAnimationFrame(reverseFrame);
    }

    function onTimeUpdate() {
      if (!video || direction !== 1) return;
      // duration may be NaN briefly while metadata loads
      if (!video.duration || isNaN(video.duration)) return;
      if (video.currentTime >= video.duration - PIVOT_BUFFER_S) {
        startReverse();
      }
    }

    // Safety net — if for some reason timeupdate misses (rare), we still
    // catch the natural end and pivot. This avoids the video freezing in
    // the worst case.
    function onEnded() {
      if (direction === 1) startReverse();
    }

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      preload="auto"
      className={className}
      aria-hidden
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
