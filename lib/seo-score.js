export function computeSeoScore({ title, excerpt, body, slug, category, tags, date }) {
  const factors = {};
  let total = 0;

  // 1. Word count (25%)
  const words = body ? body.split(/\s+/).filter(Boolean).length : 0;
  let wcScore = 0;
  if (words < 300) wcScore = 0;
  else if (words < 500) wcScore = 40;
  else if (words < 800) wcScore = 70;
  else if (words <= 1500) wcScore = 100;
  else if (words <= 2500) wcScore = 90;
  else wcScore = 80;
  factors.wordCount = { score: wcScore, weight: 25, value: words };
  total += wcScore * 0.25;

  // 2. Heading structure (20%)
  const h2Count = (body || '').match(/^##\s/gm)?.length || 0;
  let hScore = 0;
  if (h2Count === 0) hScore = 0;
  else if (h2Count === 1) hScore = 40;
  else if (h2Count === 2) hScore = 70;
  else if (h2Count <= 5) hScore = 100;
  else hScore = 90;
  factors.headings = { score: hScore, weight: 20, value: h2Count };
  total += hScore * 0.20;

  // 3. Excerpt quality (20%)
  const excerptLen = (excerpt || '').length;
  let eScore = 0;
  if (!excerpt || excerptLen === 0) eScore = 0;
  else if (excerptLen < 50) eScore = 20;
  else if (excerptLen < 100) eScore = 60;
  else if (excerptLen <= 160) eScore = 100;
  else eScore = 80;
  if (excerpt && title && excerpt.toLowerCase().includes(title.toLowerCase().slice(0, 20))) {
    eScore = Math.min(100, eScore + 10);
  }
  factors.excerpt = { score: eScore, weight: 20, value: excerptLen };
  total += eScore * 0.20;

  // 4. Internal links (15%)
  const allLinks = (body || '').match(/\[([^\]]*)\]\(([^)]*)\)/g) || [];
  const internalLinks = allLinks.filter(l => {
    const url = l.match(/\]\(([^)]*)\)/)?.[1] || '';
    return url.startsWith('/') && !url.startsWith('//');
  }).length;
  let ilScore = 0;
  if (internalLinks === 0) ilScore = 0;
  else if (internalLinks <= 2) ilScore = 50;
  else if (internalLinks <= 5) ilScore = 80;
  else if (internalLinks <= 10) ilScore = 100;
  else ilScore = 90;
  factors.internalLinks = { score: ilScore, weight: 15, value: internalLinks };
  total += ilScore * 0.15;

  // 5. Images/media (10%)
  const imgCount = (body || '').match(/!\[.*?\]\(.*?\)/g)?.length || 0;
  const hasCover = !!slug; // all posts have covers via frontmatter
  let imgScore = 0;
  if (imgCount === 0 && hasCover) imgScore = 40;
  else if (imgCount === 0) imgScore = 0;
  else if (imgCount <= 2) imgScore = 80;
  else imgScore = 100;
  factors.images = { score: imgScore, weight: 10, value: imgCount + (hasCover ? 1 : 0) };
  total += imgScore * 0.10;

  // 6. Has year in title - bonus check
  let yearBonus = 0;
  if (title && /\b20\d{2}\b/.test(title)) {
    yearBonus = 5;
    total += 0.05;
  }
  factors.yearInTitle = { score: yearBonus > 0 ? 100 : 0, weight: 5, value: title && /\b20\d{2}\b/.test(title) ? 1 : 0 };
  total += (yearBonus > 0 ? 100 : 0) * 0.05;

  const score = Math.round(Math.min(100, Math.max(0, total)));

  return {
    score,
    factors,
    words,
    headings: h2Count,
    excerptLen,
    internalLinks,
    images: imgCount + (hasCover ? 1 : 0),
    hasYear: yearBonus > 0,
  };
}
