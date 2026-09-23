'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Track model — populated by the server-side fetch in app/archive/page.tsx.
// The client component below runs the whole "Cabinet as a music player"
// experience: list + persistent bottom player bar + shuffle.
// ---------------------------------------------------------------------------

export type Track = {
  id: string;
  title: string;
  coverUrl: string | null;
  musicUrl: string | null;
  genre: string | null;
  poemExcerpt: string | null;
};

// Fisher–Yates — random permutation of an array. Used when the user turns
// on shuffle or hits the big "shuffle play" button.
function shuffleArr<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** All tracks are 30-second clips for now (extensions feature-flagged off).
 *  If extensions come back on we'd read music_duration from the DB and pass
 *  it through, but for now this constant keeps the UI honest. */
const TRACK_DURATION_LABEL = '0:30';

const INITIAL_VISIBLE = 20;
const LOAD_MORE_STEP = 20;

export function CabinetPlayerView({ tracks }: { tracks: Track[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Playback state — currentIdx is the index INTO the playback queue below,
  // NOT into the display `tracks` array. This distinction matters because
  // shuffle rebuilds the queue while the display list stays put.
  const [queue, setQueue] = useState<Track[]>(tracks);
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [progress, setProgress] = useState(0); // 0-1

  // Pagination — show 20 tracks initially, reveal more on click. The full
  // `tracks` array still feeds the shuffle queue + auto-advance, so
  // playback traverses everything regardless of what's visible.
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const visibleTracks = tracks.slice(0, visibleCount);
  const hasMore = visibleCount < tracks.length;

  // Rebuild the queue whenever shuffle is toggled. Preserves the currently-
  // playing track's position — so flipping shuffle mid-song doesn't restart
  // the track, just re-orders what comes next.
  useEffect(() => {
    const currentTrack = currentIdx !== null ? queue[currentIdx] : null;
    const nextQueue = shuffling ? shuffleArr(tracks) : tracks;
    setQueue(nextQueue);
    if (currentTrack) {
      const newIdx = nextQueue.findIndex((t) => t.id === currentTrack.id);
      setCurrentIdx(newIdx >= 0 ? newIdx : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffling, tracks]);

  const currentTrack = currentIdx !== null ? queue[currentIdx] : null;
  const currentUrl = currentTrack?.musicUrl ?? null;

  // Wire up progress tracking + auto-advance when a track ends.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onTime() {
      if (audio && audio.duration && !isNaN(audio.duration)) {
        setProgress(audio.currentTime / audio.duration);
      }
    }
    function onEnded() {
      // Auto-advance through the queue. If we're at the end, loop back to
      // the start — matches the "always something playing" feel we want.
      if (currentIdx === null) return;
      const nextIdx = (currentIdx + 1) % queue.length;
      setCurrentIdx(nextIdx);
      setProgress(0);
    }
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentIdx, queue]);

  // When currentIdx changes, load + play the new track (if we were already
  // playing, or if this is a fresh play click).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentUrl) return;
    if (audio.src !== currentUrl) {
      audio.src = currentUrl;
      audio.currentTime = 0;
      if (playing) {
        audio.play().catch(() => {
          /* autoplay blocked — user needs to interact */
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl]);

  // Play a specific track by its position in the queue.
  function playTrack(track: Track) {
    const idx = queue.findIndex((t) => t.id === track.id);
    if (idx < 0) return;
    const audio = audioRef.current;
    setCurrentIdx(idx);
    setPlaying(true);
    setProgress(0);
    // If it's the same track already loaded, just restart + play.
    if (audio && audio.src.endsWith(track.musicUrl ?? '')) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (currentIdx === null) {
      // Nothing playing yet — start with the first track.
      if (queue.length === 0) return;
      setCurrentIdx(0);
      setPlaying(true);
      return;
    }
    if (audio.paused) {
      audio.play().catch(() => {});
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function next() {
    if (currentIdx === null || queue.length === 0) return;
    const nextIdx = (currentIdx + 1) % queue.length;
    setCurrentIdx(nextIdx);
    setPlaying(true);
    setProgress(0);
  }

  function prev() {
    if (currentIdx === null || queue.length === 0) return;
    const prevIdx = (currentIdx - 1 + queue.length) % queue.length;
    setCurrentIdx(prevIdx);
    setPlaying(true);
    setProgress(0);
  }

  // "▶ Shuffle Play" in the list header — turns shuffle on and starts
  // playing from the first slot of the newly shuffled queue.
  function shufflePlayAll() {
    const shuffled = shuffleArr(tracks);
    setQueue(shuffled);
    setShuffling(true);
    setCurrentIdx(0);
    setPlaying(true);
    setProgress(0);
  }

  // Empty state
  if (tracks.length === 0) {
    return (
      <div className="text-center pt-10 space-y-6">
        <p className="font-serif italic text-paper/75 [text-shadow:0_2px_18px_rgba(0,0,0,0.55)]">
          No shared soundtracks yet.
        </p>
        <Link
          href="/questions"
          className="inline-flex items-center justify-center font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-300 px-7 py-3 rounded-full backdrop-blur-sm bg-ink/30"
        >
          make the first
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Hidden audio element that drives all playback */}
      <audio ref={audioRef} preload="none" />

      {/* List header — count + shuffle-play button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-paper/15">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-paper/60">
          {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
        </p>
        <button
          onClick={shufflePlayAll}
          className="inline-flex items-center gap-2 font-sans text-[10px] sm:text-[11px] tracking-[0.3em] uppercase text-brass border border-brass/50 hover:bg-brass/10 hover:border-brass transition-colors duration-300 px-4 py-2 rounded-full backdrop-blur-sm bg-ink/25"
        >
          <PlayGlyph className="w-2.5 h-2.5" />
          shuffle play
        </button>
      </div>

      {/* Track list — scrolls with the page, no separate scroller.
          Only the visible slice is rendered, but the FULL tracks array
          still drives shuffle + auto-advance behind the scenes. */}
      <ul>
        {visibleTracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i}
            isCurrent={currentTrack?.id === track.id}
            isPlaying={currentTrack?.id === track.id && playing}
            onPlay={() => {
              if (currentTrack?.id === track.id) {
                togglePlay();
              } else {
                playTrack(track);
              }
            }}
          />
        ))}
      </ul>

      {/* "View more" — reveals the next 20 tracks. Hidden once we've
          shown everything. The count updates live so the header total
          still reads the full library, not the visible slice. */}
      {hasMore && (
        <div className="pt-6 pb-4 text-center">
          <button
            onClick={() =>
              setVisibleCount((n) =>
                Math.min(n + LOAD_MORE_STEP, tracks.length)
              )
            }
            className="inline-flex items-center gap-2 font-sans text-[10px] sm:text-[11px] tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-300 px-6 py-2.5 rounded-full backdrop-blur-sm bg-ink/25"
          >
            view more
            <span className="text-paper/40">
              {visibleCount} / {tracks.length}
            </span>
          </button>
        </div>
      )}

      {/* Bottom CTA — sits above the player bar so it doesn't get covered */}
      <div className="text-center pt-8 pb-40 space-y-8">
        <Link
          href="/questions"
          className="inline-flex items-center justify-center font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-300 px-8 py-3 rounded-full backdrop-blur-sm bg-ink/30"
        >
          make your own
        </Link>
        <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-paper/65 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
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
        </p>
      </div>

      {/* Fixed bottom player bar — only renders when a track is loaded.
          Fades in on first play. Sits above the footer content thanks to
          the pb-40 on the list. */}
      <AnimatePresence>
        {currentTrack && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-ink/85 backdrop-blur-xl border-t border-paper/10"
          >
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
              {/* Left — cover + title + genre */}
              <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-none sm:w-64">
                <div className="w-11 h-11 flex-shrink-0 rounded-sm overflow-hidden bg-warmth shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
                  {currentTrack.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentTrack.coverUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-warmth via-ink to-warmth" />
                  )}
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/soundtrack/${currentTrack.id}`}
                    className="block font-serif italic text-paper text-sm leading-tight truncate hover:text-brass transition-colors"
                  >
                    {currentTrack.title}
                  </Link>
                  {currentTrack.genre && (
                    <p className="font-sans text-[9px] tracking-[0.25em] uppercase text-brass/80 truncate mt-0.5">
                      {currentTrack.genre}
                    </p>
                  )}
                </div>
              </div>

              {/* Centre — transport controls + progress bar */}
              <div className="hidden sm:flex flex-1 flex-col items-center gap-1.5">
                <div className="flex items-center gap-4">
                  <button
                    onClick={prev}
                    aria-label="previous"
                    className="text-paper/70 hover:text-brass transition-colors"
                  >
                    <PrevGlyph className="w-4 h-4" />
                  </button>
                  <button
                    onClick={togglePlay}
                    aria-label={playing ? 'pause' : 'play'}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-paper/50 hover:border-brass hover:text-brass text-paper transition-colors"
                  >
                    {playing ? (
                      <PauseGlyph className="w-3 h-3" />
                    ) : (
                      <PlayGlyph className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={next}
                    aria-label="next"
                    className="text-paper/70 hover:text-brass transition-colors"
                  >
                    <NextGlyph className="w-4 h-4" />
                  </button>
                </div>
                {/* Progress bar */}
                <div className="w-full max-w-md h-0.5 bg-paper/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brass transition-[width] duration-200 ease-linear"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>

              {/* Mobile — just show play/pause on the right */}
              <button
                onClick={togglePlay}
                aria-label={playing ? 'pause' : 'play'}
                className="sm:hidden w-9 h-9 flex items-center justify-center rounded-full border border-paper/50 text-paper hover:border-brass hover:text-brass transition-colors flex-shrink-0"
              >
                {playing ? (
                  <PauseGlyph className="w-3 h-3" />
                ) : (
                  <PlayGlyph className="w-3 h-3" />
                )}
              </button>

              {/* Right — shuffle toggle */}
              <button
                onClick={() => setShuffling((s) => !s)}
                aria-label={shuffling ? 'shuffle on' : 'shuffle off'}
                className={`hidden sm:inline-flex flex-shrink-0 w-9 h-9 items-center justify-center rounded-full transition-colors ${
                  shuffling
                    ? 'text-brass bg-brass/10'
                    : 'text-paper/60 hover:text-brass'
                }`}
              >
                <ShuffleGlyph className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// TrackRow — one row of the Cabinet list. Shows #, cover thumb, title + genre
// stack, poem excerpt, duration, and a play button that appears on hover.
// The row's current-playing state gets a brass tint so the eye tracks which
// track is live in the player bar.
// ---------------------------------------------------------------------------

function TrackRow({
  track,
  isCurrent,
  isPlaying,
  onPlay,
}: {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  return (
    <li>
      <button
        onClick={onPlay}
        className={`group w-full grid grid-cols-[3rem_12rem_1fr_auto] sm:grid-cols-[3rem_12rem_1fr_1fr_auto] items-center gap-4 sm:gap-6 px-2 sm:px-4 py-5 rounded-md transition-colors duration-200 text-left ${
          isCurrent
            ? 'bg-brass/10'
            : 'hover:bg-paper/5'
        }`}
      >
        {/* Play indicator — arrow icon by default, animated bars when
            the row is currently playing (default state), pause icon on
            hover of a playing row so tapping is obviously "stop this". */}
        <span
          className={`flex items-center justify-center h-8 ${
            isCurrent ? 'text-brass' : 'text-paper/70 group-hover:text-brass'
          } transition-colors`}
        >
          {isPlaying ? (
            <>
              <span className="group-hover:hidden">
                <PlayingIndicator large />
              </span>
              <span className="hidden group-hover:inline">
                <PauseGlyph className="w-7 h-7" />
              </span>
            </>
          ) : (
            <PlayGlyph className="w-7 h-7" />
          )}
        </span>

        {/* Cover thumbnail — 192px, roughly triple the earlier 64px so the
            art is properly visible. This turns the list into a stacked
            gallery of large record covers rather than a compact table. */}
        <div className="w-48 h-48 rounded-sm overflow-hidden bg-warmth shadow-[0_6px_24px_rgba(0,0,0,0.5)]">
          {track.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.coverUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-warmth via-ink to-warmth" />
          )}
        </div>

        {/* Title + genre — bumped up a size to balance the bigger art. */}
        <div className="min-w-0">
          <p
            className={`font-serif italic text-lg sm:text-xl leading-tight truncate ${
              isCurrent ? 'text-brass' : 'text-paper group-hover:text-brass'
            } transition-colors [text-shadow:0_2px_18px_rgba(0,0,0,0.5)]`}
          >
            {track.title}
          </p>
          {track.genre && (
            <p className="font-sans text-[10px] tracking-[0.28em] uppercase text-brass/80 mt-1.5 truncate">
              {track.genre}
            </p>
          )}
        </div>

        {/* Poem excerpt — hidden on mobile, slightly bigger on desktop
            to hold its weight next to the larger artwork. */}
        <p className="hidden sm:block font-serif italic text-paper/60 text-base leading-snug line-clamp-3">
          {track.poemExcerpt ?? ''}
        </p>

        {/* Duration */}
        <span className="font-sans text-[10px] tracking-[0.2em] tabular-nums text-paper/50">
          {TRACK_DURATION_LABEL}
        </span>
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Glyphs — inline SVGs so we don't pull an icon library just for four shapes.
// ---------------------------------------------------------------------------

function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <rect x="6" y="5" width="4" height="14" rx="0.5" />
      <rect x="14" y="5" width="4" height="14" rx="0.5" />
    </svg>
  );
}

function PrevGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M6 5h2v14H6zM20 5L9 12l11 7z" />
    </svg>
  );
}

function NextGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
    </svg>
  );
}

function ShuffleGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M16 3h5v5" />
      <path d="M4 20L21 3" />
      <path d="M21 16v5h-5" />
      <path d="M15 15l6 6" />
      <path d="M4 4l5 5" />
    </svg>
  );
}

// Animated "playing now" indicator — three bars pulsing at staggered rates.
// Sits in place of the play arrow while a track is playing. `large` prop
// scales it up to match the bigger row (used in the list); no prop = small
// (for anywhere else we ever use it).
function PlayingIndicator({ large = false }: { large?: boolean }) {
  const sizeClasses = large
    ? 'h-6 gap-[3px]'
    : 'h-3 gap-[2px]';
  const barWidth = large ? 'w-[3px]' : 'w-[2px]';
  return (
    <span className={`inline-flex items-end text-brass ${sizeClasses}`}>
      <motion.span
        className={`${barWidth} bg-current rounded-full`}
        animate={{ height: ['30%', '90%', '30%'] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className={`${barWidth} bg-current rounded-full`}
        animate={{ height: ['80%', '35%', '80%'] }}
        transition={{
          duration: 0.9,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.2,
        }}
      />
      <motion.span
        className={`${barWidth} bg-current rounded-full`}
        animate={{ height: ['45%', '95%', '45%'] }}
        transition={{
          duration: 0.9,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.4,
        }}
      />
    </span>
  );
}
