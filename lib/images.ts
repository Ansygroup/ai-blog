import { getCachedImage, cacheImage } from './db';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';

interface UnsplashResult {
  imageUrl: string;
  attribution?: string;
}

export async function fetchImage(query: string): Promise<UnsplashResult> {
  const cached = await getCachedImage(query);
  if (cached) return { imageUrl: cached.image_url, attribution: cached.attribution };

  const fallback = `https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80`;

  if (!UNSPLASH_ACCESS_KEY) return { imageUrl: fallback };

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
    );
    if (!res.ok) return { imageUrl: fallback };
    const data: any = await res.json();
    const photo = data.results?.[0];
    if (!photo) return { imageUrl: fallback };

    const result = {
      imageUrl: `${photo.urls.raw}&w=1200&q=80&fit=crop`,
      attribution: `Photo by ${photo.user.name} on Unsplash`,
    };

    await cacheImage(query, result.imageUrl, result.attribution);
    return result;
  } catch {
    return { imageUrl: fallback };
  }
}
