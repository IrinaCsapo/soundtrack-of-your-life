import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

/** AP-style title case for the link-preview title. */
const TITLE_CASE_SMALL_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'nor',
  'of', 'off', 'on', 'or', 'per', 'so', 'the', 'to', 'up', 'via', 'yet',
]);

function toTitleCase(s: string): string {
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

/**
 * Server-side metadata for the soundtrack reveal page. The page itself is a
 * client component ('use client'), which can't export `generateMetadata` —
 * so this sibling layout handles the OG / Twitter / og:image side of things.
 *
 * Why this matters:
 *   - Sets `og:title` to the actual soundtrack title (was falling back to the
 *     site-wide "Soundtrack of Your Life" default, which made link previews
 *     look generic on WhatsApp / Slack / Twitter).
 *   - Sets `og:description` to the first line of the user's poem so shares
 *     get a personal snippet under the image.
 *   - The OG image itself is auto-injected by Next.js from the sibling
 *     `opengraph-image.tsx` — no need to reference it explicitly here.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { data } = await supabaseAdmin
      .from('soundtracks')
      .select('selected_title, titles, answers')
      .eq('id', slug)
      .single();

    if (!data) {
      return { title: 'A soundtrack' };
    }

    // Take the chosen title, or fall back to the first candidate.
    const rawTitle: string =
      data.selected_title ||
      (Array.isArray(data.titles) && data.titles[0]) ||
      'a soundtrack';

    // Titles are stored lowercase in the Cabinet voice; render title-case
    // for link-preview presentation.
    const title = toTitleCase(rawTitle);

    // Description: the user's Q1 answer (the "where and when") makes a
    // lovely evocative teaser under the OG image. Fallback stays generic.
    const answers =
      (data.answers as Record<string, string> | null | undefined) ?? {};
    const description =
      answers.q1?.trim() ||
      "Tell me about a moment. I'll make it into music.";

    const shareTitle = `${title} — Soundtrack of Your Life`;

    return {
      title,
      description,
      openGraph: {
        type: 'website',
        title: shareTitle,
        description,
        siteName: 'Soundtrack of Your Life',
      },
      twitter: {
        card: 'summary_large_image',
        title: shareTitle,
        description,
      },
    };
  } catch {
    // If Supabase is unreachable or the row is missing, don't break the
    // page — fall back to the layout defaults.
    return { title: 'A soundtrack' };
  }
}

export default function SoundtrackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
