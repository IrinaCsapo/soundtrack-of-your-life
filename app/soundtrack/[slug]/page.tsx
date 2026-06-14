'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

type Status =
  | 'starting'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'unknown';

export default function SoundtrackPage() {
  const params = useParams<{ slug: string }>();
  const id = params.slug;

  const [status, setStatus] = useState<Status>('starting');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string> | null>(null);

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

  const isLoading = status === 'starting' || status === 'processing';
  const hasFailed =
    status === 'failed' || status === 'canceled' || (error && !audioUrl);
  const isReady = status === 'succeeded' && !!audioUrl;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative">
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-8 max-w-md"
          >
            <motion.p
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="font-serif text-2xl text-paper italic"
            >
              the music is finding you
            </motion.p>
            <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-whisper/80">
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
            <p className="font-serif text-xl text-paper">
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md text-center space-y-10"
          >
            <div className="space-y-2">
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-whisper/70">
                your soundtrack
              </p>
              <h1 className="font-serif text-4xl text-paper italic">
                untitled, for now
              </h1>
            </div>

            <AudioPlayer src={audioUrl} />

            {answers && (
              <div className="space-y-3 pt-6">
                {Object.values(answers)
                  .filter(Boolean)
                  .map((a, i) => (
                    <p
                      key={i}
                      className="font-serif italic text-whisper/80 text-base leading-relaxed"
                    >
                      {a}
                    </p>
                  ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-8 pt-4 font-sans text-[11px] tracking-[0.25em] uppercase">
              <a
                href={audioUrl}
                download="soundtrack.mp3"
                className="text-whisper hover:text-brass transition-colors"
              >
                download mp3
              </a>
              <a
                href="/questions"
                className="text-whisper hover:text-brass transition-colors"
              >
                make another
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="absolute bottom-8 font-sans text-[10px] tracking-[0.2em] uppercase text-whisper/60">
        from Irina&apos;s Cabinet of Delights
      </footer>
    </main>
  );
}

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

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

  return (
    <div className="flex flex-col items-center gap-6">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onEnded={() => setPlaying(false)}
      />
      <motion.button
        onClick={toggle}
        whileTap={{ scale: 0.96 }}
        animate={
          playing
            ? { boxShadow: '0 0 0 0 rgba(201,183,156,0.35)' }
            : { boxShadow: '0 0 0 0 rgba(201,183,156,0)' }
        }
        aria-label={playing ? 'pause' : 'play'}
        className="w-20 h-20 rounded-full border border-brass/40 flex items-center justify-center text-paper hover:border-brass hover:text-brass transition-colors duration-300"
      >
        {playing ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" />
            <rect x="14" y="5" width="4" height="14" />
          </svg>
        ) : (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ marginLeft: 3 }}
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}
