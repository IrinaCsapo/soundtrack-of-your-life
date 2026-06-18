'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GRADIENTS } from '@/lib/gradients';

/**
 * Three layers of gradient images, each on its own slow cycle through the
 * gradient library, blending with `mix-blend-mode` so the colours mix rather
 * than just overlap. Animates scale + rotate + drift on different rhythms
 * so the composition never looks synchronised — feels like clouds in a slow
 * weather system.
 */

type LayerConfig = {
  initialIdx: number;
  cycleMs: number; // how often this layer crossfades to a new gradient
  blend: 'normal' | 'screen' | 'overlay' | 'soft-light' | 'lighten';
  opacity: number;
  scale: [number, number, number];
  rotate: [number, number, number];
  x?: [string, string, string];
  y?: [string, string, string];
  durationS: number; // total length of one breathing cycle
  offsetIdx: number; // stagger the gradient list so layers start far apart
};

const LAYERS: LayerConfig[] = [
  {
    initialIdx: 0,
    cycleMs: 11000,
    blend: 'normal',
    opacity: 0.85,
    scale: [1, 1.08, 1],
    rotate: [-2, 2, -2],
    x: ['0%', '3%', '0%'],
    y: ['0%', '-2%', '0%'],
    durationS: 18,
    offsetIdx: 0,
  },
  {
    initialIdx: 6,
    cycleMs: 14000,
    blend: 'screen',
    opacity: 0.55,
    scale: [1.1, 1, 1.1],
    rotate: [3, -2, 3],
    x: ['-3%', '0%', '-3%'],
    y: ['2%', '0%', '2%'],
    durationS: 22,
    offsetIdx: 6,
  },
  {
    initialIdx: 11,
    cycleMs: 17000,
    blend: 'overlay',
    opacity: 0.45,
    scale: [1.05, 1.15, 1.05],
    rotate: [-1, 1, -1],
    x: ['2%', '-2%', '2%'],
    y: ['-1%', '2%', '-1%'],
    durationS: 26,
    offsetIdx: 11,
  },
];

export function AnimatedGradientHero() {
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-ink"
      aria-hidden
    >
      {LAYERS.map((cfg, i) => (
        <GradientLayer key={i} {...cfg} />
      ))}
      {/* Soft dark overlay so the hero text always reads cleanly */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/20 to-ink/55" />
    </div>
  );
}

function GradientLayer(cfg: LayerConfig) {
  const [idx, setIdx] = useState(cfg.initialIdx);

  // Each layer cycles through gradients on its own clock
  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % GRADIENTS.length);
    }, cfg.cycleMs);
    return () => clearInterval(interval);
  }, [cfg.cycleMs]);

  return (
    <motion.div
      animate={{
        scale: cfg.scale,
        rotate: cfg.rotate,
        x: cfg.x ?? ['0%', '0%', '0%'],
        y: cfg.y ?? ['0%', '0%', '0%'],
      }}
      transition={{
        duration: cfg.durationS,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className="absolute -inset-[8%]"
      style={{
        mixBlendMode: cfg.blend as React.CSSProperties['mixBlendMode'],
        opacity: cfg.opacity,
      }}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 3.5, ease: 'easeInOut' }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${GRADIENTS[idx]})` }}
        />
      </AnimatePresence>
    </motion.div>
  );
}
