'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { questions } from '@/lib/questions';
import { GRADIENTS, gradientForStep } from '@/lib/gradients';

// Loading messages cycled through while the create-soundtrack API call is in
// flight. Same phrasing / rhythm as the reveal page so the transition into
// /soundtrack/[slug] feels like one continuous loading experience.
const SUBMIT_MESSAGES = [
  'Sending your memory in',
  'Warming up the record player',
  'The music is finding you',
];

// Every free-text answer is stored with its first character capitalised.
// Applied at input-onChange (not in the shared `update` fn) so chip picks —
// which are pre-formatted labels — stay untouched and the
// options.includes(value) check in GenreSelector keeps working.
function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Hard cap on free-text answers. Prevents essay-length paragraphs that look
// bad in the reveal-page poem and shift the record layout on the album cover.
const MAX_ANSWER_LENGTH = 70;

export default function QuestionsPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [moderationMessage, setModerationMessage] = useState<string | null>(
    null
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Random starting gradient per session so each visit feels different
  const [gradientStartIdx] = useState(() =>
    Math.floor(Math.random() * GRADIENTS.length)
  );

  const currentQuestion = questions[step];
  const isLast = step === questions.length - 1;
  const currentAnswer = answers[currentQuestion.id] ?? '';
  const canAdvance =
    currentAnswer.trim().length > 0 || currentQuestion.skippable;
  const stepLabel = formatStepNumber(step + 1);
  const totalLabel = formatStepNumber(questions.length);
  const gradient = useMemo(
    () => gradientForStep(gradientStartIdx, step),
    [gradientStartIdx, step]
  );

  useEffect(() => {
    // Only auto-focus textarea for free-text questions, not chip selectors
    if (
      currentQuestion.type !== 'genre' &&
      currentQuestion.type !== 'mood'
    ) {
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [step, currentQuestion.type]);

  function update(value: string) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function next() {
    if (!canAdvance) return;
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    await submit();
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({ error: 'generation request failed' }));
        // Moderation gate — show the Cabinet's gentle message inline
        if (data.blocked && typeof data.error === 'string') {
          setModerationMessage(data.error);
          setSubmitting(false);
          return;
        }
        throw new Error(data.error || 'generation request failed');
      }
      const { slug } = await res.json();
      router.push(`/soundtrack/${slug}`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  function dismissModeration() {
    setModerationMessage(null);
    // Send them back to the first question so they can rewrite.
    // Their previous answers stay in state in case they want to keep parts.
    setStep(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canAdvance) next();
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Gradient background — cross-fades on step change.
          Fixed so it always covers viewport. pointer-events-none so it
          doesn't block clicks on content above. */}
      <div
        className="fixed inset-0 pointer-events-none bg-ink"
        aria-hidden
      >
        <AnimatePresence mode="sync">
          <motion.div
            key={gradient}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${gradient})` }}
          />
        </AnimatePresence>

        {/* Video background — fades in during the submitting state and
            carries visually into the reveal page (which uses the same
            video), so the transition from "make it" tap → new page feels
            like one continuous moment rather than a page swap. */}
        <AnimatePresence>
          {submitting && (
            <motion.video
              key="submit-video-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/bg_gradient_4_web.mp4" type="video/mp4" />
            </motion.video>
          )}
        </AnimatePresence>

        {/* Vignette + dark overlay so question text always reads */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/35 to-ink/70" />
      </div>

      {/* Top: pagination */}
      <header className="absolute top-0 left-0 right-0 z-10 pt-8 sm:pt-10 px-6 flex justify-center">
        <div className="font-sans text-[10px] sm:text-[11px] tracking-[0.4em] uppercase text-paper/70 flex items-center gap-2">
          <span className="text-brass">{stepLabel}</span>
          <span className="text-paper/30" aria-hidden>
            /
          </span>
          <span>{totalLabel}</span>
        </div>
      </header>

      {/* Center: question (or moderation message when blocked, or the
          spinning-vinyl loading state while the create-soundtrack API is
          in flight — that request is 4–6s of moderation + Claude metadata +
          Replicate kickoff, and the previous "creating soundtrack…" button
          text made the page look frozen). */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-32">
        {moderationMessage ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl text-center space-y-10"
          >
            <p className="font-display italic text-2xl sm:text-3xl text-paper leading-snug [text-shadow:0_2px_24px_rgba(0,0,0,0.55),0_0_40px_rgba(0,0,0,0.35)]">
              {moderationMessage}
            </p>
            <button
              onClick={dismissModeration}
              className="inline-flex items-center justify-center font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-300 px-7 py-3 rounded-full backdrop-blur-sm bg-ink/30"
            >
              try a different memory
            </button>
          </motion.div>
        ) : submitting ? (
          <SubmittingState />
        ) : (
        <div className="w-full max-w-2xl space-y-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
            >
              <h1
                className={`font-display text-3xl md:text-4xl italic text-paper leading-snug [text-shadow:0_2px_24px_rgba(0,0,0,0.55),0_0_40px_rgba(0,0,0,0.35)] ${
                  currentQuestion.type === 'genre' ||
                  currentQuestion.type === 'mood'
                    ? 'text-center'
                    : 'text-left'
                }`}
              >
                {currentQuestion.text}
              </h1>

              {currentQuestion.type === 'genre' ||
              currentQuestion.type === 'mood' ? (
                <GenreSelector
                  value={currentAnswer}
                  onChange={update}
                  options={currentQuestion.options ?? []}
                  placeholder={currentQuestion.placeholder}
                />
              ) : (
                <div className="space-y-1">
                  <textarea
                    ref={textareaRef}
                    className="poetry-input"
                    placeholder={currentQuestion.placeholder}
                    value={currentAnswer}
                    onChange={(e) =>
                      update(capitalizeFirst(e.target.value))
                    }
                    onKeyDown={onKeyDown}
                    rows={3}
                    maxLength={MAX_ANSWER_LENGTH}
                    aria-label={currentQuestion.text}
                  />
                  {/* Character counter — always mounted, dimmed while
                      there's plenty of room, brass as the limit approaches.
                      Rendering is unconditional so it doesn't shift layout. */}
                  <p
                    className={`text-right font-sans text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 ${
                      currentAnswer.length >= MAX_ANSWER_LENGTH
                        ? 'text-brass'
                        : currentAnswer.length >= 45
                          ? 'text-paper/70'
                          : 'text-paper/35'
                    }`}
                    aria-live="polite"
                  >
                    {currentAnswer.length} / {MAX_ANSWER_LENGTH}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Back / Next — prominent pill buttons */}
          <div className="flex items-center justify-between pt-4 gap-3">
            <button
              onClick={back}
              disabled={step === 0}
              className="inline-flex items-center justify-center font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-300 px-6 sm:px-7 py-3 rounded-full backdrop-blur-sm bg-ink/30 disabled:opacity-0 disabled:pointer-events-none"
              aria-label="previous question"
            >
              back
            </button>
            <button
              onClick={next}
              disabled={!canAdvance || submitting}
              className="inline-flex items-center justify-center font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-300 px-6 sm:px-7 py-3 rounded-full backdrop-blur-sm bg-ink/30 disabled:opacity-40 disabled:hover:border-paper/45 disabled:hover:text-paper"
              aria-label={isLast ? 'generate soundtrack' : 'next question'}
            >
              {submitting
                ? 'creating soundtrack…'
                : isLast
                  ? 'make it'
                  : 'next'}
            </button>
          </div>

          {/* Skip hint — kept mounted (visibility toggled with `invisible`)
              so the vertically-centred flex column doesn't re-centre and
              cause a jarring layout shift when a chip is tapped or the
              user starts typing. */}
          {currentQuestion.skippable && (
            <p
              className={`text-center font-sans text-[11px] tracking-[0.2em] uppercase text-paper/55 pt-2 ${
                currentAnswer.trim().length === 0 ? '' : 'invisible'
              }`}
              aria-hidden={currentAnswer.trim().length !== 0}
            >
              You can skip this one
            </p>
          )}
        </div>
        )}
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 left-0 right-0 z-10 text-center font-sans text-[10px] tracking-[0.25em] uppercase text-paper/65 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6">
        <Link
          href="/archive"
          className="hover:text-brass transition-colors duration-300"
        >
          the soundtrack cabinet
        </Link>
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
// Genre selector with chips + custom field
// ---------------------------------------------------------------------------

function GenreSelector({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  const isCustom = value.length > 0 && !options.includes(value);
  const [customText, setCustomText] = useState(isCustom ? value : '');

  useEffect(() => {
    if (isCustom) setCustomText(value);
  }, [isCustom, value]);

  function pickChip(opt: string) {
    onChange(opt);
    setCustomText('');
  }

  function typeCustom(text: string) {
    setCustomText(text);
    onChange(text);
  }

  return (
    <div className="space-y-8 pt-2">
      <div className="flex flex-wrap gap-2 justify-center">
        {options.map((opt) => {
          const selected = value === opt && !isCustom;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => pickChip(opt)}
              className={`px-4 py-2 rounded-full border text-sm font-serif italic backdrop-blur-sm transition-colors duration-300 ${
                selected
                  ? 'border-brass text-brass bg-brass/10'
                  : 'border-paper/30 text-paper/85 hover:border-paper hover:text-paper bg-ink/20'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-paper/65">
          or write your own
        </p>
        <div className="w-full max-w-sm space-y-1">
          <input
            type="text"
            value={customText}
            onChange={(e) => typeCustom(capitalizeFirst(e.target.value))}
            placeholder={placeholder}
            aria-label="custom genre"
            maxLength={MAX_ANSWER_LENGTH}
            className="w-full text-center bg-transparent border-b border-paper/30 focus:border-brass text-paper font-serif italic placeholder:text-paper/45 placeholder:italic py-2 outline-none transition-colors duration-300"
          />
          <p
            className={`text-right font-sans text-[10px] tracking-[0.2em] uppercase transition-colors duration-300 ${
              customText.length >= MAX_ANSWER_LENGTH
                ? 'text-brass'
                : customText.length >= 45
                  ? 'text-paper/70'
                  : 'text-paper/35'
            }`}
            aria-live="polite"
          >
            {customText.length} / {MAX_ANSWER_LENGTH}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SubmittingState — vinyl loading UI shown while POST /api/generate is in
// flight. Matches the reveal-page LoadingRecord so the transition into
// /soundtrack/[slug] feels like one continuous loading moment rather than
// "frozen questions page → new page".
// ---------------------------------------------------------------------------

function SubmittingState() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % SUBMIT_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="text-center space-y-8"
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.95, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="font-display italic text-xl sm:text-2xl text-paper leading-snug [text-shadow:0_2px_18px_rgba(0,0,0,0.7)]"
        >
          {SUBMIT_MESSAGES[idx]}
        </motion.p>
      </AnimatePresence>

      {/* Triple-ripple brass pulse — same loader as the reveal-page
          LoadingPulse so the visual language stays consistent across the
          transition into /soundtrack/[slug]. */}
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

      <p className="font-sans text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-paper/55 max-w-[260px] mx-auto [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
        one moment
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatStepNumber(n: number): string {
  return String(n).padStart(2, '0');
}
