import Link from 'next/link';
import { SiteNav } from '@/components/SiteNav';

export const metadata = {
  title: 'About',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen relative bg-ink px-6 py-20">
      <SiteNav />

      <article className="max-w-2xl mx-auto pt-12 sm:pt-16 pb-32 space-y-10">
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
            Soundtrack of Your Life is a small tool of delight made in Irina&apos;s
            Cabinet of Delights. Answer a few questions about a moment — a
            place, a feeling, a thing you remember — and a small constellation
            of AIs makes you a soundtrack that sounds like the memory feels.
          </p>

          <p>
            Music from MusicGen. A cinematic cover from Flux. A poetic title
            from Claude. Yours to keep. Anonymously shareable to the soundtrack
            cabinet, where strangers can listen to one another&apos;s moments
            without ever knowing whose they are.
          </p>

          <p>
            The Cabinet is a series of small tools made with care. There&apos;s
            Cosmic Pet Portraits, where your pet gets a celestial origin story.
            There&apos;s Letters from Your Future Self, where the version of you
            ten years ahead writes you a letter. This is the third room.
          </p>

          <p>
            The shared idea: ordinary moments deserve reverence. A memory of
            your grandmother&apos;s kitchen, a coastal walk with friends, a
            Tuesday in your living room — they&apos;re all worth music.
          </p>

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
        </div>

        <div className="text-center pt-8">
          <Link
            href="/questions"
            className="inline-block font-sans text-xs tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-500 px-10 py-4 rounded-full"
          >
            make yours
          </Link>
        </div>
      </article>

      <footer className="absolute bottom-6 left-0 right-0 text-center font-sans text-[10px] tracking-[0.25em] uppercase text-paper/65 flex items-center justify-center gap-3 px-6">
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
          made with love by{' '}
          <a
            href="https://irina.love"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brass transition-colors duration-300 underline-offset-4 hover:underline"
          >
            irina.love
          </a>
        </span>
      </footer>
    </main>
  );
}
