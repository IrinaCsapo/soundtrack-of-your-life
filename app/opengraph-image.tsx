import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Soundtrack of Your Life';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG() {
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
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: 10,
            textTransform: 'uppercase',
            color: 'rgba(236,231,220,0.7)',
            marginBottom: 36,
            fontFamily: 'sans-serif',
            fontWeight: 500,
          }}
        >
          THE CABINET OF DELIGHTS
        </div>

        <div
          style={{
            fontSize: 120,
            fontStyle: 'italic',
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
            color: 'rgba(236,231,220,0.85)',
            marginBottom: 50,
            textAlign: 'center',
          }}
        >
          tell me about a moment. I&apos;ll make it into music.
        </div>

        <div
          style={{
            fontSize: 18,
            letterSpacing: 8,
            textTransform: 'uppercase',
            color: 'rgba(201,183,156,0.95)',
            fontFamily: 'sans-serif',
            fontWeight: 500,
          }}
        >
          SOUNDTRACK.IRINA.LOVE
        </div>
      </div>
    ),
    { ...size }
  );
}
