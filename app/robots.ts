import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/games', '/flashcards'] },
    sitemap: 'https://www.ajsnow.me/sitemap.xml',
  };
}
