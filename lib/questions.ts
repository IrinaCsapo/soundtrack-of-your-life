export type QuestionType = 'text' | 'genre';

export type Question = {
  id: string;
  text: string;
  placeholder: string;
  skippable: boolean;
  type?: QuestionType; // defaults to 'text'
  options?: string[]; // for genre-type questions: the preset chip choices
};

/** The curated genre chip list for Q6. Tune freely. */
export const GENRE_OPTIONS = [
  'lo-fi',
  'ambient',
  'shoegaze',
  'jazz',
  '80s synth',
  'classical',
  'folk',
  'rock',
];

export const questions: Question[] = [
  {
    id: 'q1',
    text: 'Take me there. Where are you in this memory or feeling?',
    placeholder:
      'a kitchen, a road, a window seat, a hospital, a country you no longer live in…',
    skippable: false,
  },
  {
    id: 'q2',
    text: 'What time of day is it, and what does the light feel like?',
    placeholder: 'golden, blue, fluorescent, candle-warm, almost-morning…',
    skippable: false,
  },
  {
    id: 'q3',
    text: "What's one small thing you can hear, taste, or touch right now?",
    placeholder:
      "an old radio, salt on your lips, your dog's breathing, rain on a tin roof…",
    skippable: false,
  },
  {
    id: 'q4',
    text: 'If this moment had weather, what would the sky be doing?',
    placeholder:
      "a thunderstorm holding back, snow that won't stick, the kind of fog that softens everything…",
    skippable: true,
  },
  {
    id: 'q5',
    text: 'What does this memory want to whisper to you?',
    placeholder: 'one line. it can be honest. nothing has to rhyme.',
    skippable: true,
  },
  {
    id: 'q6',
    text: 'What does this feeling sound like?',
    placeholder: 'bossa nova, dream pop, gregorian chant, distorted lullaby…',
    skippable: true,
    type: 'genre',
    options: GENRE_OPTIONS,
  },
];
