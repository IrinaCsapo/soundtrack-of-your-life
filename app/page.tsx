import Link from 'next/link';
import { SiteNav } from '@/components/SiteNav';
import { PingPongVideo } from '@/components/PingPongVideo';

export default function HomePage() {
  return (
    <main className="min-h-screen min-h-[100dvh] relative overflow-hidden bg-ink flex flex-col">
      {/* Hero video — plays forward, then backward, then forward, looping */}
      <PingPongVideo
        src="/soundtrack-hero-v3.mp4"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Gradient darkening overlay so the title reads clearly over any frame */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/35 to-ink/75"
        aria-hidden
      />
      {/* Additional uniform 15% darkening to make the headline pop */}
      <div className="absolute inset-0 bg-ink/15" aria-hidden />

      {/* Top navigation */}
      <SiteNav />

      {/* Content — flex-1 makes it fill the space between nav and footer.
          Centred vertically inside that space, then shifted upward so the
          title sits higher than dead-centre (more breathing room below). */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pt-24 pb-6">
        <div className="max-w-3xl space-y-10 md:-translate-y-[50px]">
          <p className="font-sans text-[10px] sm:text-[11px] tracking-[0.4em] uppercase text-paper/70">
            from Irina&apos;s Cabinet of Delights
          </p>

          <h1 className="font-display wonk text-5xl sm:text-6xl md:text-7xl lg:text-8xl italic text-paper leading-[1.05] [text-shadow:0_2px_24px_rgba(0,0,0,0.4)]">
            Soundtrack of
            <br />
            Your Life
          </h1>

          <p className="font-serif italic text-lg sm:text-xl text-paper/85 max-w-md mx-auto leading-relaxed">
            Tell me about a moment. I&apos;ll make it into music.
          </p>

          <div className="pt-4">
            <Link
              href="/questions"
              className="inline-block font-sans text-xs sm:text-sm tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-500 px-10 py-4 rounded-full backdrop-blur-sm bg-ink/15"
            >
              create your soundtrack
            </Link>
          </div>
        </div>
      </div>

      {/* Footer — sits at the bottom of the flex column, always visible
          on the initial viewport even on mobile. */}
      <footer className="relative z-10 pb-5 px-6 text-center font-sans text-[10px] tracking-[0.25em] uppercase text-paper/65 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
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
