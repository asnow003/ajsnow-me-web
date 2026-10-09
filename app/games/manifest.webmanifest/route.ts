// Web app manifest, so "Add to Home Screen" opens the games full screen like an app.
export const dynamic = 'force-static';

export function GET() {
  return Response.json(
    {
      name: 'Family Card Games',
      short_name: 'Card Games',
      description: 'Scorekeeping for our family card games.',
      start_url: '/games',
      scope: '/games',
      display: 'standalone',
      background_color: '#FBF8F3',
      theme_color: '#534AB7',
      icons: [
        { src: '/games/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/games/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
}
