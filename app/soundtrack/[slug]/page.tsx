'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shuffling, setShuffling] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

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
        if (typeof data.isPublic === 'boolean') setIsPublic(data.isPublic);
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

  const toggleShare = useCallback(async () => {
    if (sharing) return;
    const next = !isPublic;
    setSharing(true);
    setIsPublic(next); // optimistic
    try {
      const res = await fetch(`/api/soundtrack/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: next }),
      });
      if (!res.ok) {
        setIsPublic(!next); // rollback
      }
    } catch {
      setIsPublic(!next);
    } finally {
      setSharing(false);
    }
  }, [id, isPublic, sharing]);

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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative">
      {hasFailed ? (
        <motion.div
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
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md text-center"
        >
          {/* Title block — chosen title or pick-one */}
          <motion.div variants={itemVariants} className="space-y-4">
            <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-whisper/70">
              your soundtrack
            </p>

            <AnimatePresence mode="wait">
              {selectedTitle ? (
                <motion.h1
                  key={`title-${selectedTitle}`}
                  variants={titleSwapVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="font-serif text-4xl text-paper italic leading-tight"
                >
                  {selectedTitle}
                </motion.h1>
              ) : (
                <motion.div
                  key="title-picker"
                  variants={titleSwapVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-3"
                >
                  {titles.length > 0 ? (
                    <>
                      <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-whisper/50">
                        pick one
                      </p>
                      <div className="space-y-2">
                        {titles.map((t, i) => (
                          <button
                            key={`${t}-${i}`}
                            onClick={() => pickTitle(t)}
                            className="block mx-auto font-serif text-2xl italic text-paper/85 hover:text-brass transition-colors duration-300"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={shuffleTitles}
                        disabled={shuffling || !answers}
                        className="pt-2 font-sans text-[10px] tracking-[0.25em] uppercase text-whisper/60 hover:text-brass transition-colors duration-300 disabled:opacity-40"
                      >
                        {shuffling ? 'shuffling…' : 'shuffle'}
                      </button>
                    </>
                  ) : (
                    <h1 className="font-serif text-4xl text-paper italic leading-tight">
                      untitled, for now
                    </h1>
                  )}
                </motion.div>
              )}
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
                    className="font-serif italic text-whisper/85 text-base leading-[1.7]"
                  >
                    {value}
                  </motion.p>
                ))}
            </motion.div>
          )}

          {/* Share-to-archive toggle (only after music ready) */}
          {musicReady && (
            <motion.div variants={itemVariants} className="pb-10">
              <button
                onClick={toggleShare}
                disabled={sharing}
                className="inline-flex items-center gap-3 font-sans text-[11px] tracking-[0.25em] uppercase text-whisper hover:text-brass transition-colors duration-300 group"
                aria-pressed={isPublic}
              >
                <span
                  className={`w-9 h-5 rounded-full border transition-colors duration-300 relative ${
                    isPublic
                      ? 'border-brass bg-brass/20'
                      : 'border-whisper/40 bg-transparent group-hover:border-whisper'
                  }`}
                  aria-hidden
                >
                  <span
                    className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                      isPublic
                        ? 'left-[18px] bg-brass'
                        : 'left-0.5 bg-whisper/60 group-hover:bg-whisper'
                    }`}
                  />
                </span>
                {isPublic ? 'shared to the cabinet' : 'share to the cabinet'}
              </button>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center gap-4 font-sans text-[11px] tracking-[0.25em] uppercase"
          >
            {audioUrl ? (
              <a
                href={audioUrl}
                download="soundtrack.mp3"
                className="text-whisper hover:text-brass transition-colors duration-300"
              >
                download mp3
              </a>
            ) : (
              <span className="text-whisper/30">download mp3</span>
            )}
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

      <footer className="absolute bottom-8 font-sans text-[10px] tracking-[0.3em] uppercase text-whisper/60 flex items-center gap-3">
        <a
          href="/archive"
          className="hover:text-brass transition-colors duration-300"
        >
          the cabinet
        </a>
        <span className="text-whisper/30" aria-hidden>
          ·
        </span>
        <span>from Irina&apos;s Cabinet of Delights</span>
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
}: {
  coverUrl: string | null;
  audioUrl: string | null;
  musicReady: boolean;
  musicLoading: boolean;
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
  return (
    <div className="text-center space-y-3">
      <motion.p
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="font-serif text-base text-paper italic"
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
    </div>
  );
}
