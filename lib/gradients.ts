/**
 * Gradient images used as backgrounds throughout the question flow.
 *
 * Files live in `public/images/gradients/`, named gradient-1.jpg through gradient-N.jpg.
 * One gets picked per question step (with a randomised starting offset) so
 * the four-question flow feels different every session.
 *
 * Adding new gradients: drop the file in public/images/gradients/ and add its path
 * to the array below.
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
  '/images/gradients/gradient-14.jpg',
  '/images/gradients/gradient-15.jpg',
  '/images/gradients/gradient-16.jpg',
];

export function gradientForStep(startIdx: number, step: number): string {
  return GRADIENTS[(startIdx + step) % GRADIENTS.length];
}
