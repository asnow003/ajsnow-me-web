import { appIcon } from '@/components/games/AppIcon';

// Icon listed in the web app manifest.
export const dynamic = 'force-static';

export function GET() {
  return appIcon(192);
}
