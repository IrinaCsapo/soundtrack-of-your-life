/**
 * Gradient images used as backgrounds throughout the experience.
 *
 * Place the files in `public/images/gradients/`, named exactly as below.
 * One gets picked per question step (with a randomised starting offset) so
 * the four-question flow feels different every session.
 */
export const GRADIENTS = [
  '/images/gradients/gradient-1.jpg',
  '/images/gradients/gradient-2.jpg',
  '/images/gradients/gradient-3.jpg',
  '/images/gradients/gradient-4.jpg',
  '/images/gradients/gradient-5.jpg',
  '/images/gradients/gradient-6.jpg',
  '/images/gradients/gradient-7.jpg',
  '/images/gradients/gradient-8.jpg',
  '/images/gradients/gradient-9.jpg',
  '/images/gradients/gradient-10.jpg',
  '/images/gradients/gradient-11.jpg',
  '/images/gradients/gradient-12.jpg',
  '/images/gradients/gradient-13.jpg',
];

export function gradientForStep(startIdx: number, step: number): string {
  return GRADIENTS[(startIdx + step) % GRADIENTS.length];
}
