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

  // Auto-focus the textarea every time we change step
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [step]);

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
        const { error } = await res.json().catch(() => ({ error: 'generation request failed' }));
        throw new Error(error || 'generation request failed');
      }
      const { slug } = await res.json();

      // Stash the answers so the reveal page can render them as a soft poem.
      // Lives in sessionStorage until we wire up Supabase.
      try {
        sessionStorage.setItem(`answers:${slug}`, JSON.stringify(answers));
      } catch {
        /* private mode etc — non-fatal */
      }

      router.push(`/soundtrack/${slug}`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'something went wrong');
      setSubmitting(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter (no shift) advances; shift+enter inserts a newline
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
            className="space-y-6"
          >
            <h1 className="font-serif text-2xl md:text-3xl text-paper leading-snug">
              {currentQuestion.text}
            </h1>
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

          <div className="flex gap-2" aria-label={`step ${step + 1} of ${questions.length}`}>
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
