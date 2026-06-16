'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { SiteNav } from '@/components/SiteNav';
import { GRADIENTS } from '@/lib/gradients';

/** Deterministic gradient pick from the soundtrack slug — same soundtrack
 *  always has the same background, so shareable links look consistent. */
function gradientForSlug(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

const LOADING_MESSAGES = [
  'your soundtrack is finding its shape',
  'stitching the memory into music',
  'translating your moment into sound',
  'the music is finding you',
];

type Status =
  | 'starting'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'unknown';

// ---------------------------------------------------------------------------
// Motion variants
// ---------------------------------------------------------------------------

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.16, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
};

const poemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.22, delayChildren: 0.15 },
  },
};

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
  },
};

const titleSwapVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.3 } },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SoundtrackPage() {
  const params = useParams<{ slug: string }>();
  const id = params.slug;

  const [status, setStatus] = useState<Status>('starting');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [shuffling, setShuffling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Poll status — single source of truth, no more sessionStorage
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const res = await fetch(`/api/soundtrack/${id}/status`);
        const data = await res.json();
        if (cancelled) return;

        setStatus(data.status ?? 'unknown');
        if (data.audioUrl) setAudioUrl(data.audioUrl);
        if (data.coverUrl) setCoverUrl(data.coverUrl);
        if (Array.isArray(data.titles)) setTitles(data.titles);
        if (data.selectedTitle) setSelectedTitle(data.selectedTitle);
        if (data.answers) setAnswers(data.answers);
        if (data.error) setError(String(data.error));

        // Keep polling while music or cover is still working
        const musicWorking =
          data.status === 'starting' || data.status === 'processing';
        const coverWorking =
          data.coverStatus === 'starting' || data.coverStatus === 'processing';
        if ((musicWorking || coverWorking) && !cancelled) {
          timer = setTimeout(poll, 2000);
        }
      } catch {
        if (!cancelled) setError('lost connection — try refreshing');
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const pickTitle = useCallback(
    async (title: string) => {
      setSelectedTitle(title);
      try {
        await fetch(`/api/soundtrack/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedTitle: title }),
        });
      } catch (err) {
        console.error('save title failed', err);
      }
    },
    [id]
  );

  const shuffleTitles = useCallback(async () => {
    if (!answers || shuffling) return;
    setShuffling(true);
    try {
      const res = await fetch('/api/titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.titles)) setTitles(data.titles);
    } catch (err) {
      console.error('shuffle failed', err);
    } finally {
      setShuffling(false);
    }
  }, [answers, shuffling]);

  async function downloadAudio() {
    if (!audioUrl || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(audioUrl);
      if (!res.ok) throw new Error('failed to fetch audio');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const filename = buildFilename(
        selectedTitle || (titles[0] ?? null),
        new Date()
      );

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error('download failed', err);
      // Fallback: open in new tab so the user can save manually
      window.open(audioUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      prompt('Copy this link:', window.location.href);
    }
  }

  const musicLoading = status === 'starting' || status === 'processing';
  const musicReady = status === 'succeeded' && !!audioUrl;
  const hasFailed =
    status === 'failed' || status === 'canceled' || (error && !audioUrl);

  const gradient = useMemo(() => gradientForSlug(id), [id]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
      {/* Gradient background — deterministic from slug */}
      <div className="fixed inset-0 pointer-events-none bg-ink" aria-hidden>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${gradient})`, opacity: 0.45 }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/45 to-ink/85" />
      </div>
      <SiteNav />
      {hasFailed ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center space-y-6 max-w-md"
        >
          <p className="font-serif text-xl text-paper italic">
            the music got lost on the way
          </p>
          <p className="font-sans text-sm text-whisper">
            {error ?? 'something went wrong with the generation'}
          </p>
          <a
            href="/questions"
            className="inline-block font-sans text-xs tracking-[0.25em] uppercase text-whisper hover:text-brass transition-colors"
          >
            try again
          </a>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 w-full max-w-md text-center"
        >
          {/* Title block — auto-picked (no picker UI anymore) */}
          <motion.div variants={itemVariants} className="space-y-4">
            <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-paper/70 [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]">
              your soundtrack
            </p>

            <AnimatePresence mode="wait">
              <motion.h1
                key={`title-${selectedTitle || titles[0] || 'loading'}`}
                variants={titleSwapVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="font-display wonk text-4xl sm:text-5xl text-paper italic leading-tight [text-shadow:0_2px_24px_rgba(0,0,0,0.55),0_0_40px_rgba(0,0,0,0.35)]"
              >
                {selectedTitle || titles[0] || 'finding your title…'}
              </motion.h1>
            </AnimatePresence>
          </motion.div>

          {/* Cover + play button — the album-cover moment */}
          <motion.div
            variants={itemVariants}
            className="flex justify-center pt-12 pb-12"
          >
            <CoverWithPlayer
              coverUrl={coverUrl}
              audioUrl={audioUrl}
              musicReady={musicReady}
              musicLoading={musicLoading}
              title={selectedTitle || titles[0] || 'a soundtrack'}
            />
          </motion.div>

          {/* Poem (skip q4 — that's the genre) */}
          {answers && (
            <motion.div
              variants={poemVariants}
              initial="hidden"
              animate="visible"
              className="space-y-5 pb-10"
            >
              {Object.entries(answers)
                .filter(([key, value]) => value && key !== 'q4')
                .map(([key, value]) => (
                  <motion.p
                    key={key}
                    variants={lineVariants}
                    className="font-serif italic text-paper/90 text-base leading-[1.7] [text-shadow:0_2px_18px_rgba(0,0,0,0.6)]"
                  >
                    {value}
                  </motion.p>
                ))}
            </motion.div>
          )}

          {/* Actions — prominent pill buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2"
          >
            {audioUrl ? (
              <button
                onClick={downloadAudio}
                disabled={downloading}
                className="inline-flex items-center justify-center font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-300 px-7 py-3 rounded-full backdrop-blur-sm bg-ink/30 disabled:opacity-50"
              >
                {downloading ? 'saving…' : 'download mp3'}
              </button>
            ) : (
              <span className="inline-flex items-center justify-center font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-paper/30 border border-paper/20 px-7 py-3 rounded-full">
                download mp3
              </span>
            )}
            <button
              onClick={copyLink}
              className="inline-flex items-center justify-center font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-300 px-7 py-3 rounded-full backdrop-blur-sm bg-ink/30"
            >
              {copied ? 'copied' : 'copy link'}
            </button>
            <a
              href="/questions"
              className="inline-flex items-center justify-center font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-300 px-7 py-3 rounded-full backdrop-blur-sm bg-ink/30"
            >
              make another
            </a>
          </motion.div>
        </motion.div>
      )}

      <footer className="absolute bottom-8 left-0 right-0 z-10 text-center font-sans text-[10px] tracking-[0.25em] uppercase text-paper/70 flex items-center justify-center gap-3 px-6">
        <a
          href="/archive"
          className="hover:text-brass transition-colors duration-300"
        >
          the soundtrack cabinet
        </a>
        <span className="text-whisper/30" aria-hidden>
          ·
        </span>
        <span>
          made by{' '}
          <a
            href="https://irina.love"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brass transition-colors duration-300 underline-offset-4 hover:underline"
          >
            irina.love
          </a>
        </span>
      </footer>
    </main>
  );
}

// ---------------------------------------------------------------------------
// CoverWithPlayer — cover image as album art, play button + progress ring overlay
// ---------------------------------------------------------------------------

function CoverWithPlayer({
  coverUrl,
  audioUrl,
  musicReady,
  musicLoading,
  title,
}: {
  coverUrl: string | null;
  audioUrl: string | null;
  musicReady: boolean;
  musicLoading: boolean;
  title: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onTime() {
      if (audio && audio.duration && !isNaN(audio.duration)) {
        setProgress(audio.currentTime / audio.duration);
      }
    }
    function onEnded() {
      setPlaying(false);
      setProgress(1);
    }
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  // ---------------------------------------------------------------------------
  // MediaSession — populate the iOS/Android lock-screen / Control Center player
  // with the cover artwork, title, and working play/pause controls.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (
      typeof navigator === 'undefined' ||
      !('mediaSession' in navigator) ||
      !audioUrl
    ) {
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: 'Soundtrack of Your Life',
        album: "Irina's Cabinet of Delights",
        artwork: coverUrl
          ? [
              { src: coverUrl, sizes: '512x512', type: 'image/png' },
              { src: coverUrl, sizes: '1024x1024', type: 'image/png' },
            ]
          : [],
      });
    } catch (err) {
      // Older browsers / unsupported environments — non-fatal
      console.warn('MediaSession metadata failed:', err);
    }
  }, [audioUrl, coverUrl, title]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    const handlePlay = () => {
      const audio = audioRef.current;
      if (audio) {
        audio.play();
        setPlaying(true);
      }
    };
    const handlePause = () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        setPlaying(false);
      }
    };

    navigator.mediaSession.setActionHandler('play', handlePlay);
    navigator.mediaSession.setActionHandler('pause', handlePause);

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
    };
  }, []);

  // Keep the OS-level playback state in sync with what's happening here.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }
    try {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    } catch {
      /* unsupported — non-fatal */
    }
  }, [playing]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  // Geometry for the brass progress ring
  const buttonSize = 96;
  const stroke = 1.5;
  const radius = (buttonSize - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="relative w-72 h-72 sm:w-80 sm:h-80">
      {/* Audio element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}

      {/* Cover image */}
      <div className="absolute inset-0 rounded-sm overflow-hidden bg-warmth shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
        <AnimatePresence>
          {coverUrl ? (
            <motion.img
              key={coverUrl}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              src={coverUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <CoverPlaceholder />
          )}
        </AnimatePresence>

        {/* Centered vignette so the play button is always readable */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at center, rgba(14,13,17,0.55) 0%, rgba(14,13,17,0.15) 35%, rgba(14,13,17,0) 60%)',
          }}
          aria-hidden
        />
      </div>

      {/* Play / pause button */}
      <div className="absolute inset-0 flex items-center justify-center">
        {musicReady && audioUrl ? (
          <motion.button
            onClick={toggle}
            whileTap={{ scale: 0.96 }}
            animate={playing ? { scale: [1, 1.015, 1] } : { scale: 1 }}
            transition={
              playing
                ? { duration: 4, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.3 }
            }
            aria-label={playing ? 'pause' : 'play'}
            className="relative flex items-center justify-center text-paper hover:text-brass transition-colors duration-500 group rounded-full"
            style={{ width: buttonSize, height: buttonSize }}
          >
            <svg
              className="absolute inset-0 -rotate-90"
              width={buttonSize}
              height={buttonSize}
              aria-hidden
            >
              <circle
                cx={buttonSize / 2}
                cy={buttonSize / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke}
                className="text-paper/40 group-hover:text-brass/60 transition-colors duration-500"
              />
              <circle
                cx={buttonSize / 2}
                cy={buttonSize / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="text-brass transition-[stroke-dashoffset] duration-200 ease-linear"
              />
            </svg>
            {playing ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <rect x="7" y="5" width="3.5" height="14" rx="0.5" />
                <rect x="13.5" y="5" width="3.5" height="14" rx="0.5" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ marginLeft: 3 }}
                aria-hidden
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </motion.button>
        ) : musicLoading ? (
          <LoadingPulse />
        ) : null}
      </div>
    </div>
  );
}

function CoverPlaceholder() {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute inset-0 bg-gradient-to-br from-warmth via-ink to-warmth"
      aria-hidden
    />
  );
}

function LoadingPulse() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center space-y-7 px-6">
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.95, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="font-display italic text-base sm:text-lg text-paper [text-shadow:0_2px_18px_rgba(0,0,0,0.7)]"
        >
          {LOADING_MESSAGES[idx]}
        </motion.p>
      </AnimatePresence>

      {/* Triple-ripple pulse */}
      <div className="relative w-14 h-14 mx-auto">
        <motion.span
          animate={{ scale: [1, 2.4, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full border border-brass"
          aria-hidden
        />
        <motion.span
          animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0.05, 0.6] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeOut',
            delay: 0.6,
          }}
          className="absolute inset-0 rounded-full border border-brass/70"
          aria-hidden
        />
        <motion.span
          animate={{
            scale: [0.85, 1.15, 0.85],
            opacity: [0.85, 0.55, 0.85],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-[18px] rounded-full bg-brass/50"
          aria-hidden
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filename helper
// "honey at four" → "honey-at-four_2026-06-15_21-44.mp3"
// ---------------------------------------------------------------------------

function buildFilename(title: string | null, date: Date): string {
  const safeTitle = (title || 'untitled')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'untitled';

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');

  return `${safeTitle}_${yyyy}-${mm}-${dd}_${hh}-${mi}.mp3`;
}
