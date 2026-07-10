'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * A spinning vinyl record used as the loading state on both the questions
 * page (during submit) and the reveal page (while music is being generated).
 *
 * The record is deep-purple with an iridescent violet crescent highlight —
 * the highlight is what makes the spin visible to the eye. A perfectly
 * symmetric disc would look static even while rotating; the off-centre
 * highlight sweeps around and gives the eye something to track.
 *
 * Real vinyl at 33⅓ RPM = 1.8s per rotation. We slow to ~4s so it feels
 * meditative rather than urgent-loader-y.
 */
export function VinylRecord({
  /** Tailwind sizing classes. Default fits inside a 320px cover square. */
  className = 'w-40 h-40 sm:w-44 sm:h-44',
  /** Rotation duration in seconds. Higher = slower, more meditative. */
  spinSeconds = 4,
  /** Unique ID suffix to avoid SVG <defs> id collisions when rendered
   *  multiple times on the same page. Defaults to 'default'. */
  idSuffix = 'default',
}: {
  className?: string;
  spinSeconds?: number;
  idSuffix?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  // Groove rings — many concentric circles at slightly-varied opacities so
  // the surface looks like real pressed vinyl instead of a flat coloured disc.
  const grooves = Array.from({ length: 45 }, (_, i) => {
    const r = 35 + i * 1.4;
    const op = 0.045 + (i % 3 === 0 ? 0.03 : 0);
    return (
      <circle
        key={i}
        cx="100"
        cy="100"
        r={r}
        fill="none"
        stroke={`rgba(8,4,20,${op})`}
        strokeWidth="0.5"
      />
    );
  });

  // Unique gradient IDs so multiple VinylRecords on the same page don't
  // collide (SVG <defs> is document-scoped).
  const baseId = `vinylBase-${idSuffix}`;
  const highlightId = `vinylHighlight-${idSuffix}`;
  const labelId = `vinylLabel-${idSuffix}`;
  const irisId = `vinylIridescent-${idSuffix}`;

  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={`${className} drop-shadow-[0_6px_28px_rgba(80,40,140,0.55)]`}
      animate={shouldReduceMotion ? undefined : { rotate: 360 }}
      transition={
        shouldReduceMotion
          ? undefined
          : { duration: spinSeconds, repeat: Infinity, ease: 'linear' }
      }
      aria-label="a record is spinning"
      role="img"
    >
      <defs>
        {/* Bright violet base — the coloured vinyl itself. Kept bright
            enough that the record reads clearly against the dark reveal-page
            background AND doesn't disappear against a colourful cover
            fading in behind it. */}
        <radialGradient id={baseId} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#6b34c2" />
          <stop offset="45%" stopColor="#3f1a80" />
          <stop offset="80%" stopColor="#1c0a4a" />
          <stop offset="100%" stopColor="#0a041e" />
        </radialGradient>

        {/* Iridescent violet crescent highlight — off-centre so the eye
            reads rotation. This is the key detail that makes the record
            look like it's catching light and spinning. Bright enough to
            read as a specular reflection on real coloured vinyl. */}
        <radialGradient id={highlightId} cx="28%" cy="28%" r="68%">
          <stop offset="0%" stopColor="rgba(220,180,255,0.60)" />
          <stop offset="18%" stopColor="rgba(190,130,255,0.32)" />
          <stop offset="45%" stopColor="rgba(140,80,220,0.10)" />
          <stop offset="75%" stopColor="rgba(90,50,160,0)" />
        </radialGradient>

        {/* Secondary iridescent hint on the opposite side — a subtler
            blue-violet reflection that adds real coloured-vinyl depth. */}
        <radialGradient id={irisId} cx="72%" cy="70%" r="55%">
          <stop offset="0%" stopColor="rgba(110,160,240,0.22)" />
          <stop offset="40%" stopColor="rgba(90,110,200,0.06)" />
          <stop offset="70%" stopColor="rgba(50,30,110,0)" />
        </radialGradient>

        {/* Brass centre label — matches the site's palette */}
        <radialGradient id={labelId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d4a865" />
          <stop offset="85%" stopColor="#b18a3f" />
          <stop offset="100%" stopColor="#8f6f2f" />
        </radialGradient>
      </defs>

      {/* Base coloured disc */}
      <circle cx="100" cy="100" r="99" fill={`url(#${baseId})`} />

      {/* Concentric grooves — dark rings over the colour */}
      {grooves}

      {/* Off-centre purple/violet highlight sweep */}
      <circle cx="100" cy="100" r="99" fill={`url(#${highlightId})`} />

      {/* Secondary blue-violet iridescence */}
      <circle cx="100" cy="100" r="99" fill={`url(#${irisId})`} />

      {/* Centre label */}
      <circle cx="100" cy="100" r="30" fill={`url(#${labelId})`} />
      <circle
        cx="100"
        cy="100"
        r="30"
        fill="none"
        stroke="rgba(14,13,17,0.35)"
        strokeWidth="0.4"
      />
      <circle
        cx="100"
        cy="100"
        r="14"
        fill="none"
        stroke="rgba(14,13,17,0.22)"
        strokeWidth="0.3"
      />

      {/* Label typography */}
      <text
        x="100"
        y="93"
        textAnchor="middle"
        fill="rgba(14,13,17,0.72)"
        fontSize="5.2"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
      >
        Soundtrack
      </text>
      <text
        x="100"
        y="100.5"
        textAnchor="middle"
        fill="rgba(14,13,17,0.55)"
        fontSize="2.6"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        letterSpacing="0.6"
      >
        OF YOUR LIFE
      </text>

      {/* Centre spindle hole */}
      <circle cx="100" cy="100" r="2.4" fill="#050214" />

      {/* Outer rim highlight — thin bright edge, catches light */}
      <circle
        cx="100"
        cy="100"
        r="99"
        fill="none"
        stroke="rgba(200,160,255,0.15)"
        strokeWidth="0.5"
      />
    </motion.svg>
  );
}
