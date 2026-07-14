import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '@/lib/supabase';

export const alt = 'Your soundtrack';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** AP-style title case — matches the reveal page + archive + metadata. */
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

type Props = { params: Promise<{ slug: string }> };

/**
 * Fetch a subset of a Google Font for use inside ImageResponse.
 * `text` ensures we only download the characters we need (much smaller).
 * Returns `null` on any failure so callers can fall back to a system font
 * rather than the whole OG endpoint 500-ing — a missing custom font gives
 * an uglier preview, but a 500 gives no preview at all.
 */
async function loadGoogleFont(
  family: string,
  text: string
): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      family
    )}&text=${encodeURIComponent(text)}`;

    const cssRes = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
      },
    });
    if (!cssRes.ok) return null;
    const css = await cssRes.text();

    const match = css.match(
      /src:\s*url\((.+?)\)\s*format\('?(opentype|truetype|woff2|woff)'?\)/
    );
    if (!match) return null;

    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch (err) {
    console.error('[og] loadGoogleFont failed:', err);
    return null;
  }
}

export default async function OG({ params }: Props) {
  const { slug } = await params;

  // Fetch what we need for the OG card. Wrapped in try/catch so a Supabase
  // hiccup can't take down the whole endpoint — we just fall through to the
  // generic "a soundtrack" title with a gradient card, which is still a
  // valid share preview.
  let data: {
    cover_url: string | null;
    selected_title: string | null;
    titles: string[] | null;
  } | null = null;
  try {
    const res = await supabaseAdmin
      .from('soundtracks')
      .select('cover_url, selected_title, titles')
      .eq('id', slug)
      .single();
    data = res.data;
  } catch (err) {
    console.error('[og] supabase fetch failed:', err);
  }

  const coverUrl: string | null = data?.cover_url ?? null;
  const rawTitle: string =
    data?.selected_title ||
    (Array.isArray(data?.titles) && data?.titles?.[0]) ||
    'a soundtrack';
  const title = toTitleCase(rawTitle);

  // Fetch Fraunces italic, subset to only the characters used in this title.
  // Add uppercase letters explicitly so the subset covers every character
  // that might appear after title-casing — otherwise Flux can drop glyphs
  // silently when it hits an uppercase letter that wasn't in the subset.
  const fontSubset = title + title.toUpperCase() + title.toLowerCase();
  const fraunces = await loadGoogleFont(
    'Fraunces:ital,wght@1,500',
    fontSubset
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background:
            'radial-gradient(circle at 80% 70%, #8B5CF6 0%, transparent 50%),' +
            'radial-gradient(circle at 20% 30%, #EC4899 0%, transparent 45%),' +
            'linear-gradient(135deg, #1A1226 0%, #0E0D11 70%, #0E0D11 100%)',
          color: '#ECE7DC',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 64,
            padding: 80,
            width: '100%',
            height: '100%',
          }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              width={460}
              height={460}
              style={{
                width: 460,
                height: 460,
                borderRadius: 6,
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: 460,
                height: 460,
                borderRadius: 6,
                background:
                  'linear-gradient(135deg, #2D1B69 0%, #6D28D9 100%)',
                display: 'flex',
              }}
            />
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: 1,
              maxWidth: 540,
            }}
          >
            <div
              style={{
                fontSize: 20,
                letterSpacing: 8,
                textTransform: 'uppercase',
                color: 'rgba(236,231,220,0.7)',
                marginBottom: 28,
                fontWeight: 500,
              }}
            >
              YOUR SOUNDTRACK
            </div>

            <div
              style={{
                fontSize: 72,
                fontStyle: 'italic',
                fontFamily: 'Fraunces',
                lineHeight: 1.05,
                marginBottom: 44,
                color: '#ECE7DC',
                display: 'flex',
              }}
            >
              {title}
            </div>

            <div
              style={{
                fontSize: 18,
                letterSpacing: 7,
                textTransform: 'uppercase',
                color: 'rgba(201,183,156,0.95)',
                fontWeight: 500,
              }}
            >
              SOUNDTRACK.IRINA.LOVE
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      // Only register the font if we actually loaded it — if Google Fonts
      // was unreachable we render with the built-in fallback rather than
      // 500-ing the whole OG endpoint (which is what causes "no share
      // preview at all" behaviour on LinkedIn/WhatsApp/etc.).
      fonts: fraunces
        ? [
            {
              name: 'Fraunces',
              data: fraunces,
              style: 'italic',
              weight: 500,
            },
          ]
        : [],
    }
  );
}
