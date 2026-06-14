export type QuestionType = 'text' | 'genre';

export type Question = {
  id: string;
  text: string;
  placeholder: string;
  skippable: boolean;
  type?: QuestionType; // defaults to 'text'
  options?: string[]; // for genre-type questions: the preset chip choices
};

/** The curated genre chip list for Q4. Tune freely. */
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
    text: 'Take me there. Where and when?',
    placeholder:
      "a kitchen, last summer, my mom's car, 3am, somewhere I haven't been…",
    skippable: false,
  },
  {
    id: 'q2',
    text: 'What can you hear, touch, or notice?',
    placeholder:
      "a kettle, sweat on your skin, the smell of rain, someone's laugh…",
    skippable: false,
  },
  {
    id: 'q3',
    text: 'What does this moment want to whisper to you?',
    placeholder: 'one line. it can be honest. nothing has to rhyme.',
    skippable: true,
  },
  {
    id: 'q4',
    text: 'What does this feeling sound like?',
    placeholder: 'bossa nova, dream pop, gregorian chant, distorted lullaby…',
    skippable: true,
    type: 'genre',
    options: GENRE_OPTIONS,
  },
];
