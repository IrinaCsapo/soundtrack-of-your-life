'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion, type Variants } from 'framer-motion';

type Status =
  | 'starting'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'unknown';

// ---------------------------------------------------------------------------
// Motion variants — used for the staggered reveal
// ---------------------------------------------------------------------------

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.18, delayChildren: 0.1 },
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
    transition: { staggerChildren: 0.22, delayChildren: 0.2 },
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

// ---------------------------------------------------------------------------
// Reveal page
// ---------------------------------------------------------------------------

export default function SoundtrackPage() {
  const params = useParams<{ slug: string }>();
  const id = params.slug;

  const [status, setStatus] = useState<Status>('starting');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string> | null>(null);
  const [copied, setCopied] = useState(false);

  // Read the user's answers from sessionStorage (set by the question flow).
  useEffect(() => {
    const stored =
      typeof window !== 'undefined'
        ? sessionStorage.getItem(`answers:${id}`)
        : null;
    if (stored) {
      try {
        setAnswers(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, [id]);

  // Poll the status endpoint every 2s until the prediction settles.
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
        if (data.error) {
          setError(
            typeof data.error === 'string'
              ? data.error
              : 'something went wrong with the generation'
          );
        }

        const stillWorking =
          data.status === 'starting' || data.status === 'processing';
        if (stillWorking && !cancelled) {
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

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Older browsers / restricted contexts — fall back to a prompt
      prompt('Copy this link:', window.location.href);
    }
  }

  const isLoading = status === 'starting' || status === 'processing';
  const hasFailed =
    status === 'failed' || status === 'canceled' || (error && !audioUrl);
  const isReady = status === 'succeeded' && !!audioUrl;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative">
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-10 max-w-md"
          >
            <motion.p
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="font-serif text-2xl text-paper italic"
            >
              the music is finding you
            </motion.p>

            <motion.div
              animate={{ opacity: [0.25, 0.9, 0.25] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.6,
              }}
              className="flex justify-center"
              aria-hidden
            >
              <span className="w-1 h-1 rounded-full bg-brass" />
            </motion.div>

            <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-whisper/70">
              this can take up to a minute — please keep this tab open
            </p>
          </motion.div>
        )}

        {hasFailed && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-6 max-w-md"
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
        )}

        {isReady && audioUrl && (
          <motion.div
            key="ready"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-md text-center"
          >
            <motion.div variants={itemVariants} className="space-y-3">
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-whisper/70">
                your soundtrack
              </p>
              <h1 className="font-serif text-4xl text-paper italic leading-tight">
                untitled, for now
              </h1>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex justify-center pt-12 pb-14"
            >
              <AudioPlayer src={audioUrl} />
            </motion.div>

            {answers && (
              <motion.div
                variants={poemVariants}
                initial="hidden"
                animate="visible"
                className="space-y-5 pb-14"
              >
                {Object.values(answers)
                  .filter(Boolean)
                  .map((a, i) => (
                    <motion.p
                      key={i}
                      variants={lineVariants}
                      className="font-serif italic text-whisper/85 text-base leading-[1.7]"
                    >
                      {a}
                    </motion.p>
                  ))}
              </motion.div>
            )}

            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center gap-4 font-sans text-[11px] tracking-[0.25em] uppercase"
            >
              <a
                href={audioUrl}
                download="soundtrack.mp3"
                className="text-whisper hover:text-brass transition-colors duration-300"
              >
                download mp3
              </a>
              <span className="text-whisper/30" aria-hidden>
                ·
              </span>
              <button
                onClick={copyLink}
                className="text-whisper hover:text-brass transition-colors duration-300"
              >
                {copied ? 'copied' : 'copy link'}
              </button>
              <span className="text-whisper/30" aria-hidden>
                ·
              </span>
              <a
                href="/questions"
                className="text-whisper hover:text-brass transition-colors duration-300"
              >
                make another
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="absolute bottom-8 font-sans text-[10px] tracking-[0.3em] uppercase text-whisper/60">
        from Irina&apos;s Cabinet of Delights
      </footer>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Audio player — circle with a brass progress ring + soft breathing animation
// ---------------------------------------------------------------------------

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1

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
  }, []);

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

  // Geometry for the progress ring
  const size = 104;
  const stroke = 1.5;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <>
      <audio ref={audioRef} src={src} preload="auto" />
      <motion.button
        onClick={toggle}
        whileTap={{ scale: 0.96 }}
        animate={
          playing
            ? { scale: [1, 1.015, 1] }
            : { scale: 1 }
        }
        transition={
          playing
            ? { duration: 4, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
        aria-label={playing ? 'pause' : 'play'}
        className="relative flex items-center justify-center text-paper hover:text-brass transition-colors duration-500 group rounded-full"
        style={{ width: size, height: size }}
      >
        {/* Background ring */}
        <svg
          className="absolute inset-0 -rotate-90"
          width={size}
          height={size}
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-brass/25 group-hover:text-brass/45 transition-colors duration-500"
          />
          {/* Progress ring (fills as the track plays) */}
          <circle
            cx={size / 2}
            cy={size / 2}
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

        {/* Play / Pause icon */}
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
    </>
  );
}
