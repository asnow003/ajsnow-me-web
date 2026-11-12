import { ImageResponse } from 'next/og';

// Home-screen icon for Flashcards: a fanned stack of cards on teal, the top one marked with a question mark.
// Drawn full-bleed (iOS and Android round the corners themselves) with the cards inside the safe zone.
function Card({ rotate, x, y, color, children }: { rotate: number; x: number; y: number; color: string; children?: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: '52%',
        height: '38%',
        background: color,
        borderRadius: '10%',
        transform: `rotate(${rotate}deg)`,
        boxShadow: '0 6px 18px rgba(7, 40, 37, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  );
}

export function appIcon(size: number) {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#0F766E' }}>
        <Card rotate={-14} x={20} y={34} color="#5EB8AC" />
        <Card rotate={-4} x={24} y={31} color="#A7DCD3" />
        <Card rotate={6} x={26} y={30} color="#FFFFFF">
          <div style={{ display: 'flex', fontSize: size * 0.22, fontWeight: 700, color: '#0F766E', marginTop: -size * 0.01 }}>?</div>
        </Card>
      </div>
    ),
    { width: size, height: size },
  );
}
