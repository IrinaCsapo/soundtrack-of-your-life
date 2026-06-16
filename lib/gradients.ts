/**
 * Gradient images used as backgrounds throughout the question flow.
 *
 * Files live in `public/gradients/`, named gradient-1.jpg through gradient-N.jpg.
 * One gets picked per question step (with a randomised starting offset) so
 * the four-question flow feels different every session.
 *
 * Adding new gradients: drop the file in public/gradients/ and add its path
 * to the array below.
 */
export const GRADIENTS = [
  '/gradients/gradient-1.jpg',
  '/gradients/gradient-2.jpg',
  '/gradients/gradient-3.jpg',
  '/gradients/gradient-4.jpg',
  '/gradients/gradient-5.jpg',
  '/gradients/gradient-6.jpg',
  '/gradients/gradient-7.jpg',
  '/gradients/gradient-8.jpg',
  '/gradients/gradient-9.jpg',
  '/gradients/gradient-10.jpg',
  '/gradients/gradient-11.jpg',
  '/gradients/gradient-12.jpg',
  '/gradients/gradient-13.jpg',
  '/gradients/gradient-14.jpg',
  '/gradients/gradient-15.jpg',
  '/gradients/gradient-16.jpg',
];

export function gradientForStep(startIdx: number, step: number): string {
  return GRADIENTS[(startIdx + step) % GRADIENTS.length];
}
