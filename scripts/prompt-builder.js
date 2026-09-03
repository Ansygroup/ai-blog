/**
 * prompt-builder.js — generate magazine-quality Flux prompts from post content.
 *
 * Strategy: classify each post into a visual archetype (tutorial, news, review,
 * comparison, howto) and emit a custom-crafted prompt. The prompt follows the
 * editorial poster recipe: warm paper background, geometric panels, magazine
 * typography, soft cinematic light, premium photo aesthetic.
 *
 * Each archetype picks a color palette, a focal prop, a typography headline
 * (3-5 letters drawn from the title), and a pose/setting that matches the
 * subject matter.
 *
 * Output: a single string ready to send to Pollinations / Flux.
 */

const HEADLINE_RULES = [
  { maxWords: 2, max: 18, take: 2 }, // short title -> 2 words
  { maxWords: 4, max: 30, take: 2 },
  { maxWords: 99, max: 40, take: 1 }, // long title -> 1 word
];

function pickHeadlineWords(title) {
  const stop = new Set([
    'a', 'an', 'and', 'the', 'of', 'for', 'to', 'in', 'on', 'with',
    'how', 'why', 'what', 'is', 'are', 'use', 'using', 'your', 'best',
    'top', 'vs', 'versus', 'review', 'guide', 'tutorial', '2026', '2025',
    'comparison', 'compared', 'than', 'into', 'work', 'works', 'turn',
    'turns', 'that', 'this', 'you', 'they', 'from', 'about', 'over',
  ]);
  const words = String(title || '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !stop.has(w.toLowerCase()) && w.length > 2)
    .map((w) => w.toUpperCase());
  if (!words.length) return ['FLOW'];
  const total = words.join(' ').length;
  const rule = HEADLINE_RULES.find((r) => total <= r.max) || HEADLINE_RULES[HEADLINE_RULES.length - 1];
  return words.slice(0, rule.take);
}

const PALETTES = {
  warm: {
    bg: 'warm off-white textured paper',
    panel: 'mustard yellow',
    accent: 'deep coral red',
    ink: 'deep black',
    glow: 'electric blue and emerald green',
  },
  cool: {
    bg: 'deep navy blue textured paper',
    panel: 'electric purple',
    accent: 'warm amber',
    ink: 'white',
    glow: 'soft electric cyan',
  },
  energy: {
    bg: 'cream paper',
    panel: 'vibrant electric red',
    accent: 'sunshine yellow',
    ink: 'deep black',
    glow: 'coral',
  },
  mono: {
    bg: 'cool gray paper',
    panel: 'midnight black',
    accent: 'electric white',
    ink: 'white',
    glow: 'silver',
  },
  nature: {
    bg: 'sage green paper',
    panel: 'forest emerald',
    accent: 'terracotta',
    ink: 'cream',
    glow: 'gold',
  },
  retro: {
    bg: 'vintage cream',
    panel: 'burnt orange',
    accent: 'olive green',
    ink: 'deep brown',
    glow: 'mustard',
  },
  luxe: {
    bg: 'ivory paper',
    panel: 'champagne gold',
    accent: 'deep burgundy',
    ink: 'deep black',
    glow: 'rose gold',
  },
  tech: {
    bg: 'cool slate paper',
    panel: 'electric teal',
    accent: 'vivid orange',
    ink: 'white',
    glow: 'lime green',
  },
};

function pickPalette(category, tags) {
  const cat = (category || '').toLowerCase();
  const tagStr = (tags || []).join(' ').toLowerCase();
  if (cat.includes('tutorial') || cat.includes('how')) return 'warm';
  if (cat.includes('news') || tagStr.includes('ai') || tagStr.includes('automation')) return 'cool';
  if (cat.includes('review') || tagStr.includes('comparison') || tagStr.includes('vs')) return 'energy';
  if (tagStr.includes('youtube') || tagStr.includes('content') || tagStr.includes('creator')) return 'energy';
  if (tagStr.includes('productivity') || tagStr.includes('work')) return 'tech';
  if (tagStr.includes('fashion') || tagStr.includes('style')) return 'luxe';
  if (tagStr.includes('nature') || tagStr.includes('eco')) return 'nature';
  if (tagStr.includes('history') || tagStr.includes('retro')) return 'retro';
  return 'warm';
}

const ARCHETYPES = {
  tutorial: (p, headline, subject) => `Ultra premium editorial learning campaign poster with contemporary Swiss design aesthetic and warm paper craft. Clean ${p.bg} featuring subtle halftone grain, soft print imperfections, and minimalist gallery poster styling. A confident professional creative ${subject} stands at a slight angle in the center, photographed from a low angle. One hand holds a vintage fountain pen near her chin in a thoughtful teaching pose while the other hand gestures toward a large floating transparent tablet displaying step-by-step process diagrams, numbered workflow blocks, and instructional graphics in ${p.glow}. Sharp focused facial expression with calm authority, modern black turtleneck and tailored charcoal blazer, gold rim glasses, slicked back hair. Behind the subject, a large diagonal ${p.panel} rectangle cuts across the composition from top left to bottom right, partially behind the figure. A secondary ${p.accent} vertical strip anchors the right side of the frame. Strong editorial graphic collage elements layered throughout: large translucent teal circles with halftone texture, vintage black and white hands pointing illustrations, abstract ink brushstrokes, geometric cutout triangles, tiny editorial placeholder text blocks arranged as professional magazine typography, small graphic arrows pointing upward, registration shift effect on key elements, fine line patterns. Massive bold ${p.ink} sans-serif typography reading ${headline.join(' ')} dominates the upper right with secondary text 2026 in elegant spaced caps. Color palette: ${p.bg}, ${p.panel}, ${p.accent}, ${p.glow}, deep black typography, charcoal grays. Lighting: soft cinematic key light from upper right, warm highlights on face, subtle shadows, realistic skin texture, premium fashion photography quality. Style references: Pentagram design, modern agency campaign, contemporary graphic poster, Behance featured artwork, fashion magazine spread, premium typography layout, working professional aesthetic. Ultra realistic photography, 50mm lens, shallow depth of field, high contrast, crisp details, professional retouching, award winning poster design, 8K quality, vertical 4:5 ratio.`,

  news: (p, headline, subject) => `Ultra premium editorial technology product launch poster with contemporary futuristic graphic design aesthetic. Clean ${p.bg} featuring subtle halftone grain, soft print imperfections, and minimalist tech magazine styling. A focused professional young product designer ${subject} sits confidently at a clean white minimalist desk in the center, photographed in dramatic three-quarter view. Both hands are poised above a holographic floating translucent interface that displays real-time data streams, AI neural network visualizations, and analytics dashboards in ${p.glow}. The interface glows with soft light casting subtle illumination on her face and hands. Sharp concentrated facial expression, modern round tortoiseshell glasses, neat short dark hair, wearing a premium cashmere sweater and dark trousers. Behind the subject, a large vertical ${p.panel} gradient panel stretches from top to bottom, partially obscured by the figure. Strong motion blur light streaks emerge from the interface edges, creating dynamic energy and forward momentum. Graphic collage elements layered throughout: large translucent soft yellow circles with halftone texture, vintage technical diagram illustrations of circuit boards, abstract neural network line sketches, geometric cutout rectangles in muted coral, small data visualization fragments, tiny editorial placeholder text blocks arranged as professional technology magazine typography, minimal decorative arrows and dots. Massive bold ${p.ink} sans-serif typography reading ${headline.join(' ')} reads prominently across the upper third with secondary text LAUNCH in elegant spaced caps. Color palette: ${p.bg}, ${p.panel}, ${p.accent}, ${p.glow}, cream, coral accents, white typography. Lighting: soft cinematic dual lighting from above with cool fill, realistic skin texture, premium tech photography quality. Style references: Stripe product design aesthetic, Linear app design, modern SaaS campaign, contemporary graphic poster, Wired magazine cover, premium typography layout, deep work focused professional aesthetic. Ultra realistic photography, 50mm lens, shallow depth of field, high contrast, crisp details, professional retouching, award winning poster design, 8K quality, vertical 4:5 ratio.`,

  review: (p, headline, subject) => `Ultra premium editorial product comparison poster with contemporary brand campaign aesthetic. Clean ${p.bg} featuring subtle halftone grain, soft print imperfections, and minimalist design magazine styling. A charismatic young creative director ${subject} leans casually against a giant transparent floating comparison grid in the center, photographed from a dynamic low angle. One hand gestures toward the grid displaying side-by-side product renderings, feature comparison cards, and rating stars in ${p.glow}. The grid glows with soft light casting subtle illumination. Sharp discerning facial expression with raised eyebrow, modern oversized vintage denim jacket with rolled sleeves, simple white t-shirt, statement silver chain necklace, natural wavy hair with highlights. Behind the subject, a large diagonal ${p.panel} panel cuts across the composition from upper right to lower left, partially behind the figure. A secondary bright ${p.accent} vertical strip anchors the left side. Strong editorial graphic collage elements layered throughout: large translucent coral circles with halftone texture, vintage product silhouette illustrations, abstract checkmark ink sketches, geometric cutout shape fragments, small comparison icon fragments, tiny editorial placeholder text blocks arranged as professional review magazine typography, minimal decorative arrows and star symbols. Massive bold ${p.ink} condensed sans-serif typography reading ${headline.join(' ')} dominates the lower right with secondary text 2026 in elegant spaced caps. Color palette: ${p.bg}, ${p.panel}, ${p.accent}, ${p.glow}, deep navy, coral, charcoal, silver accents. Lighting: dramatic directional studio lighting with warm key light from upper right and cool fill from below, deep shadows, crisp highlights on face and hands, cinematic high contrast. Style references: Wirecutter editorial design, modern product review campaign, contemporary graphic poster, Behance featured artwork, consumer reports magazine cover, premium typography layout, expert review energy. Ultra realistic photography, 35mm wide angle lens, shallow depth of field, high contrast, crisp details, professional retouching, award winning poster design, 8K quality, vertical 4:5 ratio.`,

  content: (p, headline, subject) => `Ultra premium editorial content creator campaign poster with contemporary creator economy aesthetic and bold graphic design. Clean ${p.bg} featuring subtle halftone grain, soft print imperfections, and minimalist creator magazine styling. A charismatic young creative content creator ${subject} leans toward the camera in a dynamic low angle shot, one hand extended holding a vintage film clapperboard partially obscuring her lower face while the other hand gives a confident thumbs up. Sharp expressive facial features with bright smile, modern oversized vintage denim jacket with rolled sleeves, simple white t-shirt, statement silver chain necklace, natural wavy auburn hair with highlights. Behind the subject, a large vibrant ${p.panel} diagonal panel cuts across the composition from upper right to lower left, partially behind the figure. A secondary bright ${p.accent} vertical strip anchors the left side. A massive vintage television studio light with barn doors creates dramatic rim lighting from above. Graphic collage elements layered throughout the composition: large translucent coral circles with halftone texture, vintage black and white clapperboard illustrations, abstract microphone line sketches, geometric cutout play button triangles in deep navy, small film strip fragments, tiny editorial placeholder text blocks arranged as professional creator magazine typography, registration shift effect on key elements, fine dot patterns. Massive bold ${p.ink} condensed sans-serif typography reading ${headline.join(' ')} dominates the lower right with secondary text 2026 in elegant spaced caps. Color palette: ${p.bg}, ${p.panel}, ${p.accent}, deep navy, coral, charcoal, silver accents. Lighting: dramatic directional studio lighting with warm key light from upper right and cool fill from below, deep shadows, crisp highlights on face and hands, cinematic high contrast. Style references: MrBeast studio aesthetic, modern creator campaign, contemporary graphic poster, Behance featured artwork, creator economy magazine cover, premium typography layout, viral content energy. Ultra realistic photography, 35mm wide angle lens, shallow depth of field, high contrast, crisp details, professional retouching, award winning poster design, 8K quality, vertical 4:5 ratio.`,
};

const SUBJECT_VARIANTS = [
  'woman',
  'man',
  'person',
  'creative',
  'designer',
];

function pickArchetype(category, tags, title, body) {
  const cat = (category || '').toLowerCase();
  const tagStr = (tags || []).join(' ').toLowerCase();
  const titleLower = (title || '').toLowerCase();
  const bodyLower = (body || '').toLowerCase();

  // explicit category wins
  if (cat.includes('tutorial') || cat.includes('how') || titleLower.startsWith('how to')) return 'tutorial';
  if (cat.includes('news')) return 'news';
  if (cat.includes('review')) return 'review';

  // content/youtube signals
  if (
    tagStr.includes('youtube') || tagStr.includes('content') || tagStr.includes('creator') ||
    tagStr.includes('script') || bodyLower.includes('youtube') || bodyLower.includes('creator') ||
    titleLower.includes('youtube') || titleLower.includes('script')
  ) return 'content';

  // review/comparison signals
  if (
    tagStr.includes('comparison') || tagStr.includes(' vs ') || titleLower.includes(' vs ') ||
    /\bvs\.?\b/i.test(titleLower) || bodyLower.includes('compared to') ||
    bodyLower.includes('comparison') || /\b(review|comparison)\b/.test(tagStr)
  ) return 'review';

  // news / launch signals
  if (
    tagStr.includes('launch') || tagStr.includes('announcement') || tagStr.includes('2026') ||
    bodyLower.includes('launch') || bodyLower.includes('announced') || bodyLower.includes('new tool')
  ) return 'news';

  return 'tutorial';
}

function buildMagazinePrompt({ title, category, excerpt, tags, body }) {
  const archetype = pickArchetype(category, tags, title, body);
  const paletteKey = pickPalette(category, tags);
  const palette = PALETTES[paletteKey];
  const headline = pickHeadlineWords(title);
  const subject = SUBJECT_VARIANTS[Math.abs(hashStr(title)) % SUBJECT_VARIANTS.length];
  const prompt = ARCHETYPES[archetype](palette, headline, subject);
  return { prompt, archetype, paletteKey, headline, subject };
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

module.exports = { buildMagazinePrompt, pickHeadlineWords, pickPalette, pickArchetype };
