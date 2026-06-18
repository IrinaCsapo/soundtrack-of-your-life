'use client';

import { useEffect, useRef } from 'react';

type Props = {
  src: string;
  className?: string;
};

/**
 * A video element that ping-pongs — plays forward, then plays backward by
 * manually scrubbing currentTime via requestAnimationFrame (browsers don't
 * reliably support negative playbackRate). When it reaches 0 it plays forward
 * again. Creates a seamless loop without a visible cut.
 */
export function PingPongVideo({ src, className = '' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let direction: 1 | -1 = 1;
    let rafId: number | null = null;
    let lastTimestamp: number | null = null;

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

    function handleEnded() {
      if (!video) return;
      direction = -1;
      lastTimestamp = null;
      video.pause();
      rafId = requestAnimationFrame(reverseFrame);
    }

    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('ended', handleEnded);
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
