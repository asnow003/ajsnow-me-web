import { MetadataRoute } from 'next';

const BASE = 'https://www.ajsnow.me';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, priority: 1.0, changeFrequency: 'weekly' },
  ];
}
