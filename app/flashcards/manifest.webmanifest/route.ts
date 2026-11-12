// Web app manifest, so "Add to Home Screen" opens flashcards full screen like an app.
export const dynamic = 'force-static';

export function GET() {
  return Response.json(
    {
      name: 'Flashcards',
      short_name: 'Flashcards',
      description: 'Make your own flashcards and study them.',
      start_url: '/flashcards',
      scope: '/flashcards',
      display: 'standalone',
      background_color: '#FBF8F3',
      theme_color: '#FBF8F3',
      icons: [
        { src: '/flashcards/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/flashcards/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
}
