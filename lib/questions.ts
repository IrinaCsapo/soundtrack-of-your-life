export type QuestionType = 'text' | 'genre' | 'mood';

export type Question = {
  id: string;
  text: string;
  placeholder: string;
  skippable: boolean;
  type?: QuestionType; // defaults to 'text'
  options?: string[]; // for chip-style questions: the preset chip choices
};

/**
 * The curated genre chip list for Q4. Tune freely.
 *
 * Each chip is a vibe / a mood / a moment, not a category. People should
 * be able to recognize the feeling, not the genre.
 */
export const GENRE_OPTIONS = [
  'distorted lullaby',
  'dreamy shoegaze',
  'psychedelic chillwave',
  'haunted piano',
  'velvet ambient',
  'midnight jazz',
  'forgotten radio',
  'crystalline drone',
];

/**
 * Mood chips for Q5 — used to inform the emotional register of the music.
 * NOT displayed back to the user on the reveal page; only used internally.
 */
export const MOOD_OPTIONS = [
  'Excited',
  'Hopeful',
  'Calm',
  'Tender',
  'Melancholic',
  'Sad',
  'Restless',
  'Reflective',
];

export const questions: Question[] = [
  {
    id: 'q1',
    text: 'Take me there. Where and when?',
    placeholder:
      "A kitchen, last summer, my mom's car, 3am, somewhere I haven't been…",
    skippable: false,
  },
  {
    id: 'q2',
    text: 'What can you hear, touch, or notice?',
    placeholder:
      "A kettle, sweat on your skin, the smell of rain, someone's laugh…",
    skippable: false,
  },
  {
    id: 'q3',
    text: 'What does this moment want to whisper to you?',
    placeholder: 'One line. It can be honest. Nothing has to rhyme.',
    skippable: true,
  },
  {
    id: 'q4',
    text: 'What does this feeling sound like?',
    placeholder: 'Bossa nova, dream pop, gregorian chant, distorted lullaby…',
    skippable: true,
    type: 'genre',
    options: GENRE_OPTIONS,
  },
  {
    id: 'q5',
    text: "What's your mood right now?",
    placeholder: 'Or describe how you feel…',
    skippable: true,
    type: 'mood',
    options: MOOD_OPTIONS,
  },
];
