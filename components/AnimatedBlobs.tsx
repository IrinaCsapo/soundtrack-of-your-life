'use client';

import { motion } from 'framer-motion';

/**
 * Ondulating colour blobs for the reveal-page background.
 *
 * Three large blurred discs — hot pink, warm orange-red, deep violet — that
 * drift and scale on staggered 18–30 second cycles. Layered over Fabiana's
 * gradient with `mix-blend-plus-lighter` so they read as light glowing
 * through the underlying paper rather than replacing it. Together they give
 * the page a fluid, breathing quality without a WebGL shader.
 *
 * All motion is CSS transform-based (no repaint on each frame), so it stays
 * comfortable on mobile. Pointer-events off so it never intercepts clicks.
 */
export function AnimatedBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Hot pink / magenta blob — the loudest colour, drives the "funk"
          feel. Slow slow drift, moderate scale pulse. */}
      <motion.div
        aria-hidden
        className="absolute rounded-full mix-blend-plus-lighter"
        style={{
          width: '80vmax',
          height: '80vmax',
          top: '-15%',
          left: '-10%',
          background:
            'radial-gradient(circle, rgba(255,45,180,0.55) 0%, rgba(255,45,180,0) 60%)',
          filter: 'blur(90px)',
        }}
        animate={{
          x: ['-10%', '25%', '15%', '-10%'],
          y: ['-5%', '15%', '30%', '-5%'],
          scale: [1, 1.25, 0.9, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Warm orange-red blob — the flame quality. Slightly faster cycle
          for visual counterpoint. Offset delay so the two loudest blobs
          are never at peak size at the same moment. */}
      <motion.div
        aria-hidden
        className="absolute rounded-full mix-blend-plus-lighter"
        style={{
          width: '70vmax',
          height: '70vmax',
          top: '20%',
          left: '40%',
          background:
            'radial-gradient(circle, rgba(255,95,45,0.45) 0%, rgba(255,95,45,0) 60%)',
          filter: 'blur(110px)',
        }}
        animate={{
          x: ['5%', '-25%', '20%', '5%'],
          y: ['0%', '25%', '-15%', '0%'],
          scale: [1, 0.85, 1.2, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: -6,
        }}
      />

      {/* Deep violet blob — the anchor. Slowest cycle, largest reach.
          Balances the two warm blobs so the page never feels one-note. */}
      <motion.div
        aria-hidden
        className="absolute rounded-full mix-blend-plus-lighter"
        style={{
          width: '95vmax',
          height: '95vmax',
          top: '-20%',
          left: '30%',
          background:
            'radial-gradient(circle, rgba(140,60,220,0.50) 0%, rgba(140,60,220,0) 60%)',
          filter: 'blur(130px)',
        }}
        animate={{
          x: ['-15%', '20%', '-25%', '-15%'],
          y: ['-15%', '10%', '25%', '-15%'],
          scale: [1.1, 0.9, 1.25, 1.1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: -12,
        }}
      />
    </div>
  );
}
