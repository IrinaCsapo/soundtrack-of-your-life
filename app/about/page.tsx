import Link from 'next/link';
import { SiteNav } from '@/components/SiteNav';

export const metadata = {
  title: 'About',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen relative overflow-hidden px-6 py-20">
      {/* Gradient-14 background */}
      <div className="fixed inset-0 pointer-events-none bg-ink" aria-hidden>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/images/gradients/gradient-14.jpg)',
            opacity: 0.45,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/65 via-ink/45 to-ink/80" />
      </div>

      <SiteNav />

      <article className="relative z-10 max-w-2xl mx-auto pt-12 sm:pt-16 pb-32 space-y-10">
        <header className="text-center space-y-3">
          <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-whisper/70">
            about
          </p>
          <h1 className="font-display wonk text-5xl sm:text-6xl text-paper italic leading-tight">
            this small thing
          </h1>
        </header>

        <div className="space-y-6 font-serif text-lg text-paper/85 leading-[1.75] italic">
          <p>
            Soundtrack of Your Life is a small tool of delight made in
            Irina&apos;s Cabinet of Delights. Answer a few questions about a
            moment, a place, a feeling or a thing you remember, to turn them
            into a soundtrack that feels like that moment.
          </p>

          <p>
            The questions guide you from a concrete sensory anchor towards
            something more poetic and soulful. At the end, you receive a
            soundtrack — listenable, downloadable and shareable.
          </p>

          <p>This is a gift, and it&apos;s yours to keep.</p>

          <p className="pt-4">
            Made with love by Irina, at{' '}
            <a
              href="https://irina.love"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brass hover:underline underline-offset-4"
            >
              irina.love
            </a>
            .
          </p>

          <p className="text-base text-paper/75">
            Gradient textured backgrounds created by a real human, artist and
            illustrator{' '}
            <a
              href="https://fabianafiesmann.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brass hover:underline underline-offset-4"
            >
              Fabiana Fiesmann
            </a>
            .
          </p>
        </div>

        <div className="text-center pt-8">
          <Link
            href="/questions"
            className="inline-block font-sans text-xs sm:text-sm tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-500 px-10 py-4 rounded-full"
          >
            make yours now
          </Link>
        </div>
      </article>

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
