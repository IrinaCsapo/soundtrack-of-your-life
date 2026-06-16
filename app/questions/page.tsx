'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { questions } from '@/lib/questions';
import { GRADIENTS, gradientForStep } from '@/lib/gradients';

export default function QuestionsPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
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
    if (currentQuestion.type !== 'genre') {
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
        const { error } = await res
          .json()
          .catch(() => ({ error: 'generation request failed' }));
        throw new Error(error || 'generation request failed');
      }
      const { slug } = await res.json();
      router.push(`/soundtrack/${slug}`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'something went wrong');
      setSubmitting(false);
    }
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

      {/* Center: question */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-32">
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
              <h1 className="font-display text-3xl md:text-4xl italic text-paper leading-snug text-center [text-shadow:0_2px_24px_rgba(0,0,0,0.55),0_0_40px_rgba(0,0,0,0.35)]">
                {currentQuestion.text}
              </h1>

              {currentQuestion.type === 'genre' ? (
                <GenreSelector
                  value={currentAnswer}
                  onChange={update}
                  options={currentQuestion.options ?? []}
                  placeholder={currentQuestion.placeholder}
                />
              ) : (
                <textarea
                  ref={textareaRef}
                  className="poetry-input"
                  placeholder={currentQuestion.placeholder}
                  value={currentAnswer}
                  onChange={(e) => update(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={3}
                  aria-label={currentQuestion.text}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Back / Next */}
          <div className="flex items-center justify-between pt-4 font-sans text-xs tracking-[0.25em] uppercase">
            <button
              onClick={back}
              disabled={step === 0}
              className="text-paper/85 hover:text-brass transition-colors duration-300 disabled:opacity-0"
              aria-label="previous question"
            >
              back
            </button>
            <button
              onClick={next}
              disabled={!canAdvance || submitting}
              className="text-paper/85 hover:text-brass transition-colors duration-300 disabled:opacity-30 disabled:hover:text-paper/85"
              aria-label={isLast ? 'generate soundtrack' : 'next question'}
            >
              {submitting ? 'brewing…' : isLast ? 'make it' : 'next'}
            </button>
          </div>

          {currentQuestion.skippable && currentAnswer.trim().length === 0 && (
            <p className="text-center font-sans text-[11px] tracking-[0.2em] uppercase text-paper/55 pt-2">
              you can skip this one
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 left-0 right-0 z-10 text-center font-sans text-[10px] tracking-[0.25em] uppercase text-paper/65 flex items-center justify-center gap-3 px-6">
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
          made with love by{' '}
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
        <input
          type="text"
          value={customText}
          onChange={(e) => typeCustom(e.target.value)}
          placeholder={placeholder}
          aria-label="custom genre"
          className="w-full max-w-sm text-center bg-transparent border-b border-paper/30 focus:border-brass text-paper font-serif italic placeholder:text-paper/45 placeholder:italic py-2 outline-none transition-colors duration-300"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatStepNumber(n: number): string {
  return String(n).padStart(2, '0');
}
