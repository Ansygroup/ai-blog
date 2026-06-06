export interface SeoScoreResult {
  score: number;
  details: Record<string, { pass: boolean; score: number; message: string }>;
}

export function scoreArticle(content: string, title: string, meta: string, tags: string[], wordCount: number, faqCount: number): SeoScoreResult {
  const details: Record<string, { pass: boolean; score: number; message: string }> = {};
  let total = 0;

  // 1. Title length (30-65 chars)
  const titleOk = title.length >= 30 && title.length <= 65;
  const titleScore = titleOk ? 15 : title.length < 30 ? 5 : 10;
  total += titleScore;
  details.title = {
    pass: titleOk,
    score: titleScore,
    message: titleOk ? `${title.length} chars ✓` : `${title.length} chars (target: 30-65)`,
  };

  // 2. Meta description (150-165 chars)
  const metaOk = meta.length >= 140 && meta.length <= 165;
  const metaScore = metaOk ? 15 : meta.length < 100 ? 5 : 10;
  total += metaScore;
  details.meta = {
    pass: metaOk,
    score: metaScore,
    message: metaOk ? `${meta.length} chars ✓` : `${meta.length} chars (target: 150-165)`,
  };

  // 3. Word count
  const wcTarget = wordCount >= 1500 ? 15 : wordCount >= 800 ? 10 : wordCount >= 400 ? 7 : 3;
  total += wcTarget;
  details.wordCount = {
    pass: wordCount >= 1500,
    score: wcTarget,
    message: wordCount >= 1500 ? `${wordCount} words ✓` : `${wordCount} words (target: 1500+)`,
  };

  // 4. H1 present
  const hasH1 = title.length > 0;
  total += hasH1 ? 5 : 0;
  details.h1 = {
    pass: hasH1,
    score: hasH1 ? 5 : 0,
    message: hasH1 ? 'H1 present ✓' : 'Missing H1',
  };

  // 5. H2 sections
  const h2Matches = content.match(/^##\s/gm);
  const h2Count = h2Matches?.length || 0;
  const h2Score = h2Count >= 3 ? 15 : h2Count >= 1 ? 10 : 0;
  total += h2Score;
  details.h2 = {
    pass: h2Count >= 3,
    score: h2Score,
    message: h2Count >= 3 ? `${h2Count} H2 sections ✓` : `${h2Count} H2 (target: 3+)`,
  };

  // 6. Tags (3+)
  const tagsOk = tags.length >= 3;
  total += tagsOk ? 10 : tags.length >= 1 ? 5 : 0;
  details.tags = {
    pass: tagsOk,
    score: tagsOk ? 10 : 5,
    message: tagsOk ? `${tags.length} tags ✓` : `${tags.length} tags (target: 3+)`,
  };

  // 7. FAQ (2+)
  const faqOk = faqCount >= 2;
  total += faqOk ? 10 : 0;
  details.faq = {
    pass: faqOk,
    score: faqOk ? 10 : 0,
    message: faqOk ? `${faqCount} FAQs ✓` : 'No FAQs',
  };

  // 8. Contains "2026" (freshness)
  const hasYear = content.includes('2026') || title.includes('2026');
  total += hasYear ? 10 : 0;
  details.freshness = {
    pass: hasYear,
    score: hasYear ? 10 : 0,
    message: hasYear ? 'Contains 2026 ✓' : 'Missing 2026 freshness signal',
  };

  // 9. Bullet/numbered lists
  const hasLists = /(^|\n)[*-]\s|\d+\.\s/m.test(content);
  total += hasLists ? 5 : 0;
  details.lists = {
    pass: hasLists,
    score: hasLists ? 5 : 0,
    message: hasLists ? 'Lists present ✓' : 'No bullet/numbered lists',
  };

  // 10. Call to action / conclusion signal
  const hasCTA = /\b(conclusion|verdict|final.thought|try|buy|get.start|recommend|summary)\b/i.test(content);
  total += hasCTA ? 5 : 0;
  details.cta = {
    pass: hasCTA,
    score: hasCTA ? 5 : 0,
    message: hasCTA ? 'CTA/conclusion present ✓' : 'No clear conclusion or CTA',
  };

  const finalScore = Math.min(Math.round(total), 100);

  return { score: finalScore, details };
}

export function shouldPublish(score: number): boolean {
  return score >= 75;
}
