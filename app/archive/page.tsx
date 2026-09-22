import { SiteNav } from '@/components/SiteNav';
import { supabaseAdmin } from '@/lib/supabase';
import { GRADIENTS } from '@/lib/gradients';
import { CabinetPlayerView, type Track } from '@/components/CabinetPlayerView';

// Revalidate the archive every minute so new shares appear without a deploy
export const revalidate = 60;

export const metadata = {
  title: 'The Soundtrack Cabinet',
};

async function getPublicSoundtracks(): Promise<Track[]> {
  const { data, error } = await supabaseAdmin
    .from('soundtracks')
    .select('id, selected_title, titles, cover_url, music_url, shared_at, answers')
    .eq('is_public', true)
    .not('music_url', 'is', null)
    .order('shared_at', { ascending: false })
    .limit(48);

  if (error || !data) return [];

  return data.map((s) => {
    const answers = (s.answers ?? {}) as Record<string, string>;
    const rawTitle: string =
      s.selected_title ||
      (Array.isArray(s.titles) && s.titles.length > 0
        ? s.titles[0]
        : 'untitled');
    // Titles are stored lowercase in Cabinet voice; display AP-style title case.
    const title = toTitleCaseForArchive(rawTitle);
    // Poem excerpt = Q1 (the "where and when" scene line). It's the most
    // evocative single line for a list-view card.
    const poemExcerpt = answers.q1?.trim() || null;
    return {
      id: s.id,
      title,
      coverUrl: s.cover_url,
      musicUrl: s.music_url,
      genre: answers.q4 || null,
      poemExcerpt,
    };
  });
}

// AP-style title case — capitalise major words, keep small words lowercase
// unless they're first or last in the title.
const TITLE_CASE_SMALL_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'nor',
  'of', 'off', 'on', 'or', 'per', 'so', 'the', 'to', 'up', 'via', 'yet',
]);

function toTitleCaseForArchive(s: string): string {
  if (!s) return s;
  const words = s.trim().split(/\s+/);
  return words
    .map((word, i) => {
      const lower = word.toLowerCase();
      const isFirstOrLast = i === 0 || i === words.length - 1;
      if (!isFirstOrLast && TITLE_CASE_SMALL_WORDS.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export default async function ArchivePage() {
  const tracks = await getPublicSoundtracks();
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
        <div className="text-center space-y-3 mb-12">
          <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-paper/70 [text-shadow:0_2px_18px_rgba(0,0,0,0.6)]">
            the
          </p>
          <h1 className="font-display wonk text-5xl sm:text-6xl text-paper italic leading-tight [text-shadow:0_2px_24px_rgba(0,0,0,0.55),0_0_40px_rgba(0,0,0,0.35)]">
            Soundtrack Cabinet
          </h1>
          <p className="font-serif italic text-paper/85 text-base pt-4 max-w-md mx-auto leading-relaxed [text-shadow:0_2px_18px_rgba(0,0,0,0.55)]">
            Soundtracks people have shared anonymously. Each one is a moment
            someone wanted to keep.
          </p>
        </div>

        {/* List + player */}
        <CabinetPlayerView tracks={tracks} />
      </div>
    </main>
  );
}
