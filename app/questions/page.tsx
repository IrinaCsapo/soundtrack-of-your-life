'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { questions } from '@/lib/questions';

export default function QuestionsPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentQuestion = questions[step];
  const isLast = step === questions.length - 1;
  const currentAnswer = answers[currentQuestion.id] ?? '';
  const canAdvance =
    currentAnswer.trim().length > 0 || currentQuestion.skippable;

  // Auto-focus the textarea every time we change step (only for text questions)
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

      // Answers + titles are now persisted server-side (in Supabase) and
      // returned by /api/soundtrack/[id]/status, so no sessionStorage needed.

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
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
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
            <h1 className="font-serif text-2xl md:text-3xl text-paper leading-snug">
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

        <div className="flex items-center justify-between pt-6 font-sans text-xs tracking-[0.25em] uppercase">
          <button
            onClick={back}
            disabled={step === 0}
            className="text-whisper hover:text-brass transition-colors duration-300 disabled:opacity-0"
            aria-label="previous question"
          >
            back
          </button>

          <div
            className="flex gap-2"
            aria-label={`step ${step + 1} of ${questions.length}`}
          >
            {questions.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                  i === step ? 'bg-brass' : 'bg-whisper/40'
                }`}
              />
            ))}
          </div>

          <button
            onClick={next}
            disabled={!canAdvance || submitting}
            className="text-whisper hover:text-brass transition-colors duration-300 disabled:opacity-30 disabled:hover:text-whisper"
            aria-label={isLast ? 'generate soundtrack' : 'next question'}
          >
            {submitting ? 'brewing…' : isLast ? 'make it' : 'next'}
          </button>
        </div>

        {currentQuestion.skippable && currentAnswer.trim().length === 0 && (
          <p className="text-center font-sans text-[11px] tracking-[0.2em] uppercase text-whisper/60 pt-2">
            you can skip this one
          </p>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// GenreSelector — chips + an "or write your own" field
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

  // Keep the custom field in sync if the value changes externally
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
              className={`px-4 py-2 rounded-full border text-sm font-serif italic transition-colors duration-300 ${
                selected
                  ? 'border-brass text-brass bg-brass/5'
                  : 'border-whisper/30 text-whisper hover:border-whisper hover:text-paper'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-whisper/60">
          or write your own
        </p>
        <input
          type="text"
          value={customText}
          onChange={(e) => typeCustom(e.target.value)}
          placeholder={placeholder}
          aria-label="custom genre"
          className="w-full max-w-sm text-center bg-transparent border-b border-whisper/30 focus:border-brass text-paper font-serif italic placeholder:text-whisper/50 placeholder:italic py-2 outline-none transition-colors duration-300"
        />
      </div>
    </div>
  );
}
