import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '@/lib/supabase';

export const alt = 'Your soundtrack';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ slug: string }> };

/**
 * Fetch a subset of a Google Font for use inside ImageResponse.
 * `text` ensures we only download the characters we need (much smaller).
 */
async function loadGoogleFont(
  family: string,
  text: string
): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family
  )}&text=${encodeURIComponent(text)}`;

  const css = await (
    await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
      },
    })
  ).text();

  const match = css.match(
    /src: url\((.+?)\) format\('(opentype|truetype|woff2|woff)'\)/
  );
  if (!match) throw new Error('Failed to extract font URL from Google Fonts');

  const fontData = await (await fetch(match[1])).arrayBuffer();
  return fontData;
}

export default async function OG({ params }: Props) {
  const { slug } = await params;

  // Fetch what we need for the OG card
  const { data } = await supabaseAdmin
    .from('soundtracks')
    .select('cover_url, selected_title, titles')
    .eq('id', slug)
    .single();

  const coverUrl: string | null = data?.cover_url ?? null;
  const title: string =
    data?.selected_title ||
    (Array.isArray(data?.titles) && data?.titles?.[0]) ||
    'a soundtrack';

  // Fetch Fraunces italic, subset to only the characters used in this title
  const fraunces = await loadGoogleFont('Fraunces:ital,wght@1,500', title);

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
      fonts: [
        {
          name: 'Fraunces',
          data: fraunces,
          style: 'italic',
          weight: 500,
        },
      ],
    }
  );
}
