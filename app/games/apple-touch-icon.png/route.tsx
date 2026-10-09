import { appIcon } from '@/components/games/AppIcon';

// iPhone and iPad "Add to Home Screen" icon. A route rather than apple-icon.tsx so the file keeps its
// .png extension, which GitHub Pages needs to serve it as an image.
export const dynamic = 'force-static';

export function GET() {
  return appIcon(180);
}
