import { ImageResponse } from 'next/og';

// Home-screen icon for Family Card Games: two playing cards, a spade and a heart, on the games' purple.
// Drawn full-bleed (iOS and Android round the corners themselves) with the cards inside the safe zone.
const SPADE =
  'M12 2C9 7 4 9 4 14c0 2 2 4 4 4 1 0 2-.5 3-1.5-.4 1.9-1.2 3.6-2.5 4.5h7c-1.3-.9-2.1-2.6-2.5-4.5 1 1 2 1.5 3 1.5 2 0 4-2 4-4 0-5-5-7-8-12z';
const HEART =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

function Card({ path, color, rotate, x }: { path: string; color: string; rotate: number; x: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: '22%',
        width: '34%',
        height: '52%',
        background: 'white',
        borderRadius: '9%',
        transform: `rotate(${rotate}deg)`,
        boxShadow: '0 6px 18px rgba(20, 16, 60, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg viewBox="0 0 24 24" width="62%" height="62%">
        <path d={path} fill={color} />
      </svg>
    </div>
  );
}

export function appIcon(size: number) {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#534AB7' }}>
        <Card path={SPADE} color="#26215C" rotate={-12} x={18} />
        <Card path={HEART} color="#C2362F" rotate={10} x={46} />
      </div>
    ),
    { width: size, height: size },
  );
}
