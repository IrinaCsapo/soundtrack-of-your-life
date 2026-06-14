import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative">
      <div className="max-w-xl space-y-12">
        <p className="font-serif text-2xl md:text-3xl leading-relaxed text-paper/90">
          Tell me about a moment.
          <br />
          I&apos;ll make it into music.
        </p>
        <Link
          href="/questions"
          className="inline-block font-sans text-sm tracking-[0.25em] uppercase text-whisper hover:text-brass transition-colors duration-500"
        >
          begin
        </Link>
      </div>
      <footer className="absolute bottom-8 font-sans text-[10px] tracking-[0.2em] uppercase text-whisper/60">
        from Irina&apos;s Cabinet of Delights
      </footer>
    </main>
  );
}
