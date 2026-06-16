import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// Revalidate the archive every minute so new shares appear without a deploy
export const revalidate = 60;

type ArchiveItem = {
  id: string;
  title: string;
  coverUrl: string | null;
};

async function getPublicSoundtracks(): Promise<ArchiveItem[]> {
  const { data, error } = await supabaseAdmin
    .from('soundtracks')
    .select('id, selected_title, titles, cover_url, shared_at')
    .eq('is_public', true)
    .not('music_url', 'is', null)
    .order('shared_at', { ascending: false })
    .limit(48);

  if (error || !data) return [];

  return data.map((s) => ({
    id: s.id,
    title:
      s.selected_title ||
      (Array.isArray(s.titles) && s.titles.length > 0
        ? s.titles[0]
        : 'untitled'),
    coverUrl: s.cover_url,
  }));
}

export default async function ArchivePage() {
  const soundtracks = await getPublicSoundtracks();

  return (
    <main className="min-h-screen px-6 py-20">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-3 mb-16">
          <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-whisper/70">
            the cabinet&apos;s
          </p>
          <h1 className="font-serif text-5xl text-paper italic">archive</h1>
          <p className="font-serif italic text-whisper/80 text-base pt-4 max-w-md mx-auto leading-relaxed">
            soundtracks people have shared anonymously. each one is a moment
            someone wanted to keep.
          </p>
        </div>

        {/* Grid */}
        {soundtracks.length === 0 ? (
          <div className="text-center pt-10 space-y-4">
            <p className="font-serif italic text-whisper/70">
              no shared soundtracks yet.
            </p>
            <Link
              href="/questions"
              className="inline-block font-sans text-[11px] tracking-[0.25em] uppercase text-whisper hover:text-brass transition-colors duration-300"
            >
              make the first
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 sm:gap-8">
            {soundtracks.map((s) => (
              <Link key={s.id} href={`/soundtrack/${s.id}`} className="group">
                <div className="aspect-square bg-warmth rounded-sm overflow-hidden mb-3 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
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
                <p className="font-serif italic text-paper text-sm leading-tight group-hover:text-brass transition-colors duration-300">
                  {s.title}
                </p>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-24 text-center space-y-6">
          <Link
            href="/questions"
            className="inline-block font-sans text-[11px] tracking-[0.25em] uppercase text-whisper hover:text-brass transition-colors duration-300"
          >
            make your own
          </Link>
          <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-whisper/65 pt-8">
            made with love by{' '}
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
