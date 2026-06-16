import Link from 'next/link';
import { SiteNav } from '@/components/SiteNav';
import { supabaseAdmin } from '@/lib/supabase';
import { GRADIENTS } from '@/lib/gradients';

// Revalidate the archive every minute so new shares appear without a deploy
export const revalidate = 60;

export const metadata = {
  title: 'The Soundtrack Cabinet',
};

type ArchiveItem = {
  id: string;
  title: string;
  coverUrl: string | null;
  genre: string | null;
};

async function getPublicSoundtracks(): Promise<ArchiveItem[]> {
  const { data, error } = await supabaseAdmin
    .from('soundtracks')
    .select('id, selected_title, titles, cover_url, shared_at, answers')
    .eq('is_public', true)
    .not('music_url', 'is', null)
    .order('shared_at', { ascending: false })
    .limit(48);

  if (error || !data) return [];

  return data.map((s) => {
    const answers = (s.answers ?? {}) as Record<string, string>;
    return {
      id: s.id,
      title:
        s.selected_title ||
        (Array.isArray(s.titles) && s.titles.length > 0
          ? s.titles[0]
          : 'untitled'),
      coverUrl: s.cover_url,
      genre: answers.q4 || null,
    };
  });
}

export default async function ArchivePage() {
  const soundtracks = await getPublicSoundtracks();
  // Picked at render time — changes ~every 60s when the page revalidates
  const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];

  return (
    <main className="min-h-screen relative overflow-hidden px-6 py-20">
      {/* Gradient background */}
      <div className="fixed inset-0 pointer-events-none bg-ink" aria-hidden>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${gradient})`, opacity: 0.4 }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/55 to-ink/85" />
      </div>

      <SiteNav />

      <div className="relative z-10 max-w-5xl mx-auto pt-12 sm:pt-16">
        {/* Header */}
        <div className="text-center space-y-3 mb-16">
          <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-paper/70 [text-shadow:0_2px_18px_rgba(0,0,0,0.6)]">
            the
          </p>
          <h1 className="font-display wonk text-5xl sm:text-6xl text-paper italic leading-tight [text-shadow:0_2px_24px_rgba(0,0,0,0.55),0_0_40px_rgba(0,0,0,0.35)]">
            Soundtrack Cabinet
          </h1>
          <p className="font-serif italic text-paper/85 text-base pt-4 max-w-md mx-auto leading-relaxed [text-shadow:0_2px_18px_rgba(0,0,0,0.55)]">
            soundtracks people have shared anonymously. each one is a moment
            someone wanted to keep.
          </p>
        </div>

        {/* Grid */}
        {soundtracks.length === 0 ? (
          <div className="text-center pt-10 space-y-6">
            <p className="font-serif italic text-paper/75 [text-shadow:0_2px_18px_rgba(0,0,0,0.55)]">
              no shared soundtracks yet.
            </p>
            <Link
              href="/questions"
              className="inline-flex items-center justify-center font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-300 px-7 py-3 rounded-full backdrop-blur-sm bg-ink/30"
            >
              make the first
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 sm:gap-8">
            {soundtracks.map((s) => (
              <Link key={s.id} href={`/soundtrack/${s.id}`} className="group">
                <div className="aspect-square bg-warmth rounded-sm overflow-hidden mb-3 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
                  {s.coverUrl ? (
                    <img
                      src={s.coverUrl}
                      alt={s.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-warmth via-ink to-warmth" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-serif italic text-paper text-base leading-tight group-hover:text-brass transition-colors duration-300 [text-shadow:0_2px_18px_rgba(0,0,0,0.55)]">
                    {s.title}
                  </p>
                  {s.genre && (
                    <p className="font-sans text-[9px] tracking-[0.25em] uppercase text-brass/85 group-hover:text-brass transition-colors duration-300 [text-shadow:0_2px_18px_rgba(0,0,0,0.55)]">
                      {s.genre}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-24 text-center space-y-10">
          <Link
            href="/questions"
            className="inline-flex items-center justify-center font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-300 px-8 py-3 rounded-full backdrop-blur-sm bg-ink/30"
          >
            make your own
          </Link>
          <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-paper/65">
            made by{' '}
            <a
              href="https://irina.love"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brass transition-colors duration-300 underline-offset-4 hover:underline"
            >
              irina.love
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
