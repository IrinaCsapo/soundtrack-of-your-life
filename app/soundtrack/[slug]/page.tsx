'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AnimatePresence,
  motion,
  type Variants,
} from 'framer-motion';
import { SiteNav } from '@/components/SiteNav';
import { GRADIENTS } from '@/lib/gradients';

/** Deterministic gradient START index from the soundtrack slug — the reveal
 *  page then cycles through a rotating sequence beginning at that index, so
 *  every soundtrack has its own "first colour" (making shareable links look
 *  consistent on first paint) while still feeling alive over time. */
function gradientStartIndexForSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % GRADIENTS.length;
}

/** How many gradients the reveal page cycles through before wrapping. Kept
 *  small (4) so the palette feels curated to each soundtrack rather than
 *  running through the whole library. */
const GRADIENT_CYCLE_LENGTH = 4;

/** Ms between gradient crossfades. Slow enough to breathe, not distracting. */
const GRADIENT_CYCLE_MS = 22_000;

/** Capitalise the first character of a string. Used to display track titles
 *  (stored lowercase in Cabinet voice) as sentence-case H1s. */
function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Fake progress ramp so the user sees numeric progression while music is
 *  generating. Replicate doesn't expose real progress percentages for
 *  MusicGen, so we ease from 5% → 90% over ~100 seconds (the empirical
 *  average generation time), then hold at 90% until the music actually
 *  arrives, at which point the caller sets progress to 100. This is
 *  cosmetic — the goal is a sense of forward motion, not accuracy. */
const PROGRESS_TARGET_MS = 100_000;
const PROGRESS_START = 5;
const PROGRESS_HOLD = 90;

const LOADING_MESSAGES = [
  'Your soundtrack is finding its shape',
  'Stitching the memory into music',
  'Translating your moment into sound',
  'The music is finding you',
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
  const [coverStatus, setCoverStatus] = useState<Status>('starting');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extension state — ordered list of URLs for sequential playback plus the
  // current total duration and pending-extension flag. The user "keeps it
  // going" by clicking a button that fires POST /extend; polling picks up
  // the new segment as it succeeds.
  const [musicUrls, setMusicUrls] = useState<string[]>([]);
  const [musicDuration, setMusicDuration] = useState<number>(30);
  const [extensionStatus, setExtensionStatus] = useState<string>('idle');
  const [extending, setExtending] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

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
        setCoverStatus(data.coverStatus ?? 'unknown');
        if (data.audioUrl) setAudioUrl(data.audioUrl);
        if (data.coverUrl) setCoverUrl(data.coverUrl);
        if (Array.isArray(data.titles)) setTitles(data.titles);
        if (data.selectedTitle) setSelectedTitle(data.selectedTitle);
        if (data.answers) setAnswers(data.answers);
        if (data.error) setError(String(data.error));

        // Extension bookkeeping. musicUrls is the ordered playback list;
        // extensionStatus tells us if a "Keep it going" is in flight.
        if (Array.isArray(data.musicUrls) && data.musicUrls.length > 0) {
          setMusicUrls(data.musicUrls);
        }
        if (typeof data.musicDuration === 'number') {
          setMusicDuration(data.musicDuration);
        }
        if (typeof data.extensionStatus === 'string') {
          setExtensionStatus(data.extensionStatus);
          // Auto-clear the local "extending" flag once the server confirms
          // the extension finished (succeeded or failed).
          if (
            data.extensionStatus === 'succeeded' ||
            data.extensionStatus === 'failed' ||
            data.extensionStatus === 'canceled'
          ) {
            setExtending(false);
          }
        }

        // Keep polling while music, cover, OR an extension is in flight
        const musicWorking =
          data.status === 'starting' || data.status === 'processing';
        const coverWorking =
          data.coverStatus === 'starting' || data.coverStatus === 'processing';
        const extensionWorking =
          data.extensionStatus === 'starting' ||
          data.extensionStatus === 'processing';
        if (
          (musicWorking || coverWorking || extensionWorking) &&
          !cancelled
        ) {
          timer = setTimeout(poll, 2000);
        }
      } catch {
        if (!cancelled) setError('Lost connection — try refreshing.');
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // `extending` is a dep so the poll loop restarts when the user clicks
    // "Keep it going" after the initial music/cover generation already
    // finished. The loop reads fresh data each cycle and stops itself when
    // nothing is in flight, so this is idempotent.
  }, [id, extending]);

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

  // "Keep it going" — fires a continuation prediction on the server. We flip
  // the local `extending` flag immediately for optimistic UI, then the poll
  // picks up the new segment as it becomes available (see the poll effect).
  const handleExtend = useCallback(async () => {
    if (extending) return;
    if (musicDuration >= 120) return;
    setExtending(true);
    // Optimistically move status forward so the poll loop keeps running
    // until the real Replicate status comes back.
    setExtensionStatus('starting');
    try {
      const res = await fetch(`/api/soundtrack/${id}/extend`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('[extend] failed:', data);
        setExtending(false);
        setExtensionStatus('failed');
        return;
      }
    } catch (err) {
      console.error('[extend] request failed:', err);
      setExtending(false);
      setExtensionStatus('failed');
    }
  }, [extending, musicDuration, id]);

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

  // Living background — same soundtrack always starts on the same gradient
  // (deterministic from the slug so the OG image / initial paint is stable),
  // then slowly cycles through a curated sequence every ~22 seconds. Combined
  // with the ken-burns drift below, the page feels like it's breathing.
  const startIdx = useMemo(() => gradientStartIndexForSlug(id), [id]);
  const [cycleOffset, setCycleOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCycleOffset((n) => n + 1);
    }, GRADIENT_CYCLE_MS);
    return () => clearInterval(interval);
  }, []);

  // Fake progress % while music is generating. Ramps from 5→90 over ~100s,
  // holds at 90 until the real music succeeds, then jumps to 100.
  const [mountTime] = useState(() => Date.now());
  const [progress, setProgress] = useState(PROGRESS_START);

  useEffect(() => {
    if (musicReady) {
      setProgress(100);
      return;
    }
    if (!musicLoading) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - mountTime;
      const ratio = Math.min(1, elapsed / PROGRESS_TARGET_MS);
      const next = Math.round(
        PROGRESS_START + (PROGRESS_HOLD - PROGRESS_START) * ratio
      );
      setProgress(next);
    }, 500);
    return () => clearInterval(interval);
  }, [musicLoading, musicReady, mountTime]);

  // Rotate through a window of GRADIENT_CYCLE_LENGTH gradients starting at
  // startIdx. Outer modulo wraps around the full GRADIENTS array so we don't
  // read past the end.
  const gradient =
    GRADIENTS[
      (startIdx + (cycleOffset % GRADIENT_CYCLE_LENGTH)) % GRADIENTS.length
    ];
  const nextGradientKey = `${id}-${cycleOffset}`;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
      {/* Living background — a slow crossfade between gradients plus a
          subtle ken-burns drift (scale + translate) so the page never feels
          static behind the record. Base ink layer is always present so we
          never see a bare white flash between crossfades. */}
      <div className="fixed inset-0 pointer-events-none bg-ink" aria-hidden>
        <AnimatePresence mode="sync">
          <motion.div
            key={nextGradientKey}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{
              opacity: 0.5,
              scale: [1.06, 1.14, 1.06],
              x: [0, 18, 0],
              y: [0, -12, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 4, ease: 'easeInOut' },
              scale: {
                duration: GRADIENT_CYCLE_MS / 1000,
                ease: 'easeInOut',
              },
              x: {
                duration: GRADIENT_CYCLE_MS / 1000,
                ease: 'easeInOut',
              },
              y: {
                duration: GRADIENT_CYCLE_MS / 1000,
                ease: 'easeInOut',
              },
            }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${gradient})` }}
          />
        </AnimatePresence>
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
            The music got lost on the way.
          </p>
          <p className="font-sans text-sm text-whisper">
            {error ?? 'Something went wrong with the generation.'}
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
          className="relative z-10 w-full max-w-xl text-center"
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
                {capitalizeFirst(
                  selectedTitle || titles[0] || 'Finding your title…'
                )}
              </motion.h1>
            </AnimatePresence>

            {answers?.q4 && (
              <div className="flex justify-center pt-1">
                <span
                  className="inline-flex items-center rounded-full border border-brass/50 bg-ink/25 backdrop-blur-sm px-4 py-1.5 font-serif italic text-sm text-brass/95 [text-shadow:0_2px_10px_rgba(0,0,0,0.55)]"
                  aria-label="chosen genre"
                >
                  {capitalizeFirst(answers.q4)}
                </span>
              </div>
            )}
          </motion.div>

          {/* Loading indicator ABOVE the cover — sits between the genre pill
              and the album cover while music is generating. Displays the
              gentle "this can take a minute" nudge alongside a fake progress
              percentage so users see numeric progression. Vanishes cleanly
              once music is ready. */}
          <AnimatePresence>
            {musicLoading && (
              <motion.div
                key="loading-row"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-8 pb-2"
                aria-live="polite"
              >
                <p className="font-sans text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-paper/65 [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
                  this can take a minute or two — keep this tab open
                </p>
                <span
                  aria-hidden
                  className="text-paper/30 font-sans text-[10px] sm:text-[11px]"
                >
                  ·
                </span>
                <p className="font-sans text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-brass tabular-nums [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
                  {progress}%
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cover + play button — the album-cover moment */}
          <motion.div
            variants={itemVariants}
            className={`flex justify-center pb-12 ${
              musicLoading ? 'pt-4' : 'pt-12'
            }`}
          >
            <CoverWithPlayer
              coverUrl={coverUrl}
              coverFailed={
                coverStatus === 'failed' || coverStatus === 'canceled'
              }
              // Fall back to the single audioUrl if the DB hasn't caught up
              // to storing music_urls yet (backwards compat for old rows).
              musicUrls={
                musicUrls.length > 0
                  ? musicUrls
                  : audioUrl
                    ? [audioUrl]
                    : []
              }
              musicReady={musicReady}
              musicLoading={musicLoading}
              title={selectedTitle || titles[0] || 'a soundtrack'}
              onPlaybackStart={() => setHasPlayed(true)}
            />
          </motion.div>

          {/* Poem (skip q4 — that's the genre, and q5 mood which is context
              for the music, not text meant to appear on the reveal page).
              Tightened spacing — space-y-2 between lines and leading-[1.35]
              inside — so it reads as a stanza rather than a bulleted list. */}
          {answers && (
            <motion.div
              variants={poemVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2 pb-10"
            >
              {Object.entries(answers)
                .filter(
                  ([key, value]) => value && key !== 'q4' && key !== 'q5'
                )
                .map(([key, value]) => (
                  <motion.p
                    key={key}
                    variants={lineVariants}
                    className="font-serif italic text-paper/90 text-base leading-[1.35] [text-shadow:0_2px_18px_rgba(0,0,0,0.6)]"
                  >
                    {value}
                  </motion.p>
                ))}
            </motion.div>
          )}

          {/* "Keep it going" moment — a distinct pill above the standard
              actions row. Appears only once the user has actually pressed
              play (earning the option rather than surfacing it upfront) and
              hides once the track is at full 120s length. */}
          <AnimatePresence>
            {hasPlayed && musicReady && (
              <motion.div
                key="keep-going-row"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center gap-2 pt-2 pb-6"
              >
                <KeepItGoingButton
                  musicDuration={musicDuration}
                  extending={
                    extending ||
                    extensionStatus === 'starting' ||
                    extensionStatus === 'processing'
                  }
                  atMax={musicDuration >= 120}
                  onExtend={handleExtend}
                />
                {/* Small caption below showing current duration + max. */}
                <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-paper/45 [text-shadow:0_2px_10px_rgba(0,0,0,0.7)]">
                  {formatSeconds(musicDuration)} / 2:00
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions — three pills side-by-side on desktop, stacked on
              mobile. `whitespace-nowrap` on each pill so heavily-tracked
              labels never wrap to two lines. */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2"
          >
            {audioUrl ? (
              <button
                onClick={downloadAudio}
                disabled={downloading}
                className="inline-flex items-center justify-center whitespace-nowrap font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-300 px-7 py-3 rounded-full backdrop-blur-sm bg-ink/30 disabled:opacity-50"
              >
                {downloading ? 'saving…' : 'download mp3'}
              </button>
            ) : (
              <span className="inline-flex items-center justify-center whitespace-nowrap font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-paper/30 border border-paper/20 px-7 py-3 rounded-full">
                download mp3
              </span>
            )}
            <button
              onClick={copyLink}
              className="inline-flex items-center justify-center whitespace-nowrap font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-300 px-7 py-3 rounded-full backdrop-blur-sm bg-ink/30"
            >
              {copied ? 'copied' : 'copy link'}
            </button>
            <a
              href="/questions"
              className="inline-flex items-center justify-center whitespace-nowrap font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-300 px-7 py-3 rounded-full backdrop-blur-sm bg-ink/30"
            >
              make another
            </a>
          </motion.div>
        </motion.div>
      )}

      <footer className="absolute bottom-8 left-0 right-0 z-10 text-center font-sans text-[10px] tracking-[0.25em] uppercase text-paper/70 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6">
        <a
          href="/archive"
          className="hover:text-brass transition-colors duration-300"
        >
          the soundtrack cabinet
        </a>
        <span className="text-paper/30" aria-hidden>
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
        <span className="text-paper/30" aria-hidden>
          ·
        </span>
        <span>
          gradients by{' '}
          <a
            href="https://fabianafiesmann.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brass transition-colors duration-300 underline-offset-4 hover:underline"
          >
            fabiana fiesmann
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
  coverFailed,
  musicUrls,
  musicReady,
  musicLoading,
  title,
  onPlaybackStart,
}: {
  coverUrl: string | null;
  coverFailed: boolean;
  /** Ordered playback list — index 0 is the original 30s track, subsequent
   *  entries are 30s "Keep it going" continuations. Playback advances
   *  through them sequentially with the audio element. */
  musicUrls: string[];
  musicReady: boolean;
  musicLoading: boolean;
  title: string;
  /** Called the first time the user hits play. The parent uses this to
   *  reveal the "Keep it going" pill — earning it rather than showing it
   *  the moment music arrives. */
  onPlaybackStart?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);
  // segmentTime = current time within the currently-playing segment, in
  // seconds. We use it (plus the played-through segment count) to compute
  // combined progress across the whole extended track.
  const [segmentTime, setSegmentTime] = useState(0);

  // Current URL is whichever segment we're pointed at. If musicUrls hasn't
  // arrived yet (shouldn't happen when musicReady is true, but defensive),
  // fall back to null and the audio element renders empty.
  const currentUrl: string | null = musicUrls[currentSegment] ?? null;
  const totalSegments = musicUrls.length;
  const assumedSegmentSeconds = 30;

  // Combined progress across the whole extended track — smooth ring even
  // as we transition between segments.
  const progress =
    totalSegments > 0
      ? Math.min(
          1,
          (currentSegment * assumedSegmentSeconds + segmentTime) /
            (totalSegments * assumedSegmentSeconds)
        )
      : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onTime() {
      if (audio && !isNaN(audio.currentTime)) {
        setSegmentTime(audio.currentTime);
      }
    }
    function onEnded() {
      // Sequential playback — hop to the next segment if there is one,
      // otherwise stop and pin progress to 100%.
      if (currentSegment + 1 < musicUrls.length) {
        setCurrentSegment(currentSegment + 1);
        setSegmentTime(0);
        // The [currentSegment, currentUrl] effect below will load + play
        // the next URL now that state has advanced.
      } else {
        setPlaying(false);
        setSegmentTime(assumedSegmentSeconds);
      }
    }
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentSegment, musicUrls, currentUrl]);

  // When currentSegment changes, load the new URL and — if we were mid-
  // playback — auto-continue playing so the transition feels seamless.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentUrl) return;
    if (audio.src !== currentUrl) {
      audio.src = currentUrl;
      // Only auto-play if we're already in a playing state (i.e. we
      // transitioned from segment N ending → segment N+1 starting).
      if (playing) {
        audio.play().catch(() => {
          /* autoplay blocked — user will need to tap play */
        });
      }
    }
  }, [currentUrl, playing]);

  // ---------------------------------------------------------------------------
  // MediaSession — populate the iOS/Android lock-screen / Control Center player
  // with the cover artwork, title, and working play/pause controls.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (
      typeof navigator === 'undefined' ||
      !('mediaSession' in navigator) ||
      !currentUrl
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
  }, [currentUrl, coverUrl, title]);

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
      // If we finished the last segment previously and the user hits play
      // again, restart from segment 0. This also handles the initial-play
      // case when the src was set but currentTime is 0.
      if (currentSegment >= musicUrls.length - 1 && audio.ended) {
        setCurrentSegment(0);
        setSegmentTime(0);
        audio.src = musicUrls[0] ?? '';
        audio.currentTime = 0;
      }
      audio.play().catch(() => {
        /* autoplay blocked — user needs to interact */
      });
      setPlaying(true);
      // Notify the parent the first time playback starts so it can reveal
      // the "Keep it going" pill — earning it, not gifting it.
      onPlaybackStart?.();
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
      {/* Audio element — only src'd once we have at least one URL. Sequential
          playback swaps this element's src to the next URL on `ended`. */}
      {currentUrl && (
        <audio ref={audioRef} src={currentUrl} preload="auto" />
      )}

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
            <CoverPlaceholder failed={coverFailed} />
          )}
        </AnimatePresence>

        {/* Centered vignette so the play button is always readable —
            only applied when a real cover image is behind it. On the cream
            placeholder we skip it so the loading card stays clearly light
            (otherwise the 55% dark radial makes the centre look nearly
            black, which is what caused the "cover reverted to black"
            confusion). */}
        {coverUrl && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at center, rgba(14,13,17,0.55) 0%, rgba(14,13,17,0.15) 35%, rgba(14,13,17,0) 60%)',
            }}
            aria-hidden
          />
        )}
      </div>

      {/* Play / pause button */}
      <div className="absolute inset-0 flex items-center justify-center">
        {musicReady && currentUrl ? (
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

function CoverPlaceholder({ failed = false }: { failed?: boolean }) {
  return (
    <>
      {/* Cream paper ground — matches the "cover on cream torn paper" spec
          in the visual prompt so a missing / still-generating cover reads
          as a paper waiting for its collage, not as a broken dark square.
          Uses `paper` (#ECE7DC, cream) as base with a subtle brass shimmer
          through the middle. */}
      <motion.div
        initial={{ opacity: 0.9 }}
        animate={{ opacity: [0.9, 1, 0.9] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 bg-gradient-to-br from-paper via-brass/25 to-paper"
        aria-hidden
      />
      {/* Loading vs failed label — makes it obvious what state we're in
          rather than showing the same "forming" message forever if Flux
          actually errored. */}
      <div className="absolute inset-x-0 bottom-6 text-center pointer-events-none">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-ink/55">
          {failed
            ? 'the cover got lost on the way'
            : 'cover finding its shape'}
        </p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// LoadingPulse — rotating loading messages + a triple-ripple brass pulse
// while music is generating. Sits in place of the play button inside the
// cover square.
// ---------------------------------------------------------------------------

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

      {/* Triple-ripple brass pulse — two expanding rings + a soft filled
          centre that breathes. Subtle enough not to compete with the
          gradient motion behind the cover. */}
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

      {/* "This can take a minute" text used to live here, but overlaid on
          the cover image awkwardly once the cover arrived. Moved out of
          the LoadingPulse and above the cover box in the parent page. */}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KeepItGoingButton — the "extend this track" pill. Shown to the user once
// they've actually pressed play on the current version, hidden once they've
// hit the 120-second cap. Fires POST /api/soundtrack/[id]/extend via the
// onExtend callback, which the parent uses to flip its extending flag and
// restart the polling loop.
// ---------------------------------------------------------------------------

function KeepItGoingButton({
  musicDuration,
  extending,
  atMax,
  onExtend,
}: {
  musicDuration: number;
  extending: boolean;
  atMax: boolean;
  onExtend: () => void;
}) {
  if (atMax) {
    // At full length — the button transforms into a quiet marker rather
    // than disappearing entirely, so the user has feedback that they've
    // reached the ceiling.
    return (
      <span className="inline-flex items-center whitespace-nowrap font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-brass/70 border border-brass/30 px-7 py-3 rounded-full bg-ink/25">
        full length reached · 2:00
      </span>
    );
  }

  return (
    <button
      onClick={onExtend}
      disabled={extending}
      className="relative inline-flex items-center justify-center whitespace-nowrap font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-brass border border-brass/60 hover:border-brass hover:text-brass hover:bg-brass/10 transition-colors duration-300 px-7 py-3 rounded-full backdrop-blur-sm bg-ink/30 disabled:opacity-70 disabled:cursor-wait"
      aria-label={
        extending ? 'extending soundtrack' : 'extend soundtrack by 30 seconds'
      }
    >
      {extending ? (
        <span className="flex items-center gap-3">
          {/* Small brass pulse dot signals live work — subtler than a
              spinner, matches the site's Cabinet quiet aesthetic. */}
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full bg-brass"
            aria-hidden
          />
          extending
        </span>
      ) : (
        'keep it going'
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Format seconds as m:ss for the duration caption ("0:30 / 2:00").
// ---------------------------------------------------------------------------

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
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
