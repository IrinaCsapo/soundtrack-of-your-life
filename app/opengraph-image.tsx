import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Soundtrack of Your Life';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Fetch a subset of a Google Font for use inside ImageResponse.
 * The `text` parameter ensures we only download the characters we need.
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
        // Google Fonts returns different formats based on User-Agent.
        // This UA gets a clean TTF/WOFF URL we can pull binary from.
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

export default async function OG() {
  const heroText = 'Soundtrack of Your Life';
  const taglineText = "Tell me about a moment. I'll make it into music.";
  const subsetText = heroText + taglineText;

  const fraunces = await loadGoogleFont(
    'Fraunces:ital,wght@1,500',
    subsetText
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 100,
          color: '#ECE7DC',
          background:
            'radial-gradient(circle at 25% 30%, #8B5CF6 0%, transparent 45%),' +
            'radial-gradient(circle at 75% 70%, #EC4899 0%, transparent 45%),' +
            'radial-gradient(circle at 90% 20%, #F97316 0%, transparent 35%),' +
            'linear-gradient(135deg, #1A1226 0%, #0E0D11 60%, #0E0D11 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: 10,
            textTransform: 'uppercase',
            color: 'rgba(236,231,220,0.7)',
            marginBottom: 36,
            fontWeight: 500,
          }}
        >
          THE CABINET OF DELIGHTS
        </div>

        <div
          style={{
            fontSize: 120,
            fontStyle: 'italic',
            fontFamily: 'Fraunces',
            lineHeight: 1,
            marginBottom: 36,
            textAlign: 'center',
            color: '#ECE7DC',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span>Soundtrack of</span>
          <span>Your Life</span>
        </div>

        <div
          style={{
            fontSize: 30,
            fontStyle: 'italic',
            fontFamily: 'Fraunces',
            color: 'rgba(236,231,220,0.85)',
            marginBottom: 50,
            textAlign: 'center',
          }}
        >
          Tell me about a moment. I&apos;ll make it into music.
        </div>

        <div
          style={{
            fontSize: 18,
            letterSpacing: 8,
            textTransform: 'uppercase',
            color: 'rgba(201,183,156,0.95)',
            fontWeight: 500,
          }}
        >
          SOUNDTRACK.IRINA.LOVE
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
