const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');

const CANONICAL_TAGS = new Set([
  'AI tools', '2026', 'ChatGPT', 'Claude', 'Gemini', 'Perplexity', 'Cursor',
  'Jasper', 'Copy.ai', 'Surfer SEO', 'Midjourney', 'DALL-E', 'Stable Diffusion',
  'Runway', 'Descript', 'Notion AI', 'Writesonic', 'Rytr',
  'AI writing', 'AI image', 'AI video', 'AI code', 'AI search', 'AI chatbots',
  'AI transcription', 'AI models', 'AI development',
  'comparison', 'review', 'tutorial', 'best-of', 'guide', 'how-to',
  'productivity', 'content creation', 'content generation',
  'content optimization', 'marketing automation', 'prompt engineering',
  'SEO', 'deals', 'tech', 'amazon',
  'podcast', 'video editing', 'design', 'ecommerce',
]);

const TAG_MAP = {
  '1win': 'deals', '2win': 'deals',
  'adobe firefly': 'AI image', 'adobe premiere': 'video editing',
  'ai': 'AI tools', 'ai art': 'AI image', 'ai assistant': 'AI tools',
  'ai automation': 'AI tools', 'ai blog': 'content creation',
  'ai chatbot': 'AI chatbots', 'ai chatbots': 'AI chatbots',
  'ai code assistant': 'AI code', 'ai coding': 'AI code',
  'ai comparison': 'comparison', 'ai content': 'content generation',
  'ai content creation': 'content creation', 'ai content generation': 'content generation',
  'ai customer service': 'AI chatbots',
  'ai development': 'AI development', 'ai developer tools': 'AI development',
  'ai education': 'AI tools', 'ai for business': 'AI tools',
  'ai for designers': 'design', 'ai for marketing': 'marketing automation',
  'ai for seo': 'SEO', 'ai for students': 'AI tools',
  'ai for youtube': 'AI video', 'ai image generation': 'AI image',
  'ai image generator': 'AI image', 'ai image generators': 'AI image',
  'ai in ecommerce': 'ecommerce', 'ai in healthcare': 'AI tools',
  'ai integration': 'AI tools', 'ai marketing': 'marketing automation',
  'ai models': 'AI models', 'ai news': 'AI tools',
  'ai productivity': 'productivity', 'ai review': 'review',
  'ai seo': 'SEO', 'ai seo tools': 'SEO',
  'ai security': 'AI tools', 'ai social media': 'marketing automation',
  'ai tools': 'AI tools', 'ai tools for content': 'content creation',
  'ai tools for marketers': 'marketing automation',
  'ai transcription': 'AI transcription', 'ai video': 'AI video',
  'ai video generation': 'AI video', 'ai video generator': 'AI video',
  'ai video tools': 'AI video', 'ai voice': 'AI tools',
  'ai writing': 'AI writing', 'ai writing assistant': 'AI writing',
  'ai writing assistants': 'AI writing', 'ai writing tools': 'AI writing',
  'ai youtube': 'AI video', 'ai youtube tools': 'AI video',
  'amazon': 'amazon', 'amazon affiliate': 'amazon',
  'amazon finds': 'amazon',
  'api': 'AI development',
  'automation': 'AI tools',
  'best': 'best-of', 'best ai tools': 'best-of', 'best of': 'best-of',
  'chatbot': 'AI chatbots', 'chatbots': 'AI chatbots',
  'chatgpt': 'ChatGPT', 'chatgpt 4': 'ChatGPT', 'chatgpt api': 'ChatGPT',
  'chatgpt prompts': 'prompt engineering', 'chatgpt tips': 'prompt engineering',
  'chrome extension': 'AI tools',
  'claude': 'Claude', 'claude ai': 'Claude', 'claude vs chatgpt': 'comparison',
  'code': 'AI code', 'code assistant': 'AI code',
  'coding': 'AI code', 'coding tools': 'AI code',
  'comparison': 'comparison', 'comparisons': 'comparison',
  'content': 'content creation', 'content creation': 'content creation',
  'content creation tools': 'content creation',
  'content generator': 'content generation',
  'content marketing': 'content creation', 'content optimization': 'content optimization',
  'content repurposing': 'content optimization',
  'conversion rate optimization': 'marketing automation',
  'copy.ai': 'Copy.ai', 'copy ai': 'Copy.ai',
  'course creation': 'AI tools',
  'cursor': 'Cursor', 'cursor ai': 'Cursor',
  'customer service': 'AI chatbots',
  'dalle': 'DALL-E', 'dall-e': 'DALL-E', 'dalle 3': 'DALL-E',
  'data analysis': 'AI tools',
  'deals': 'deals',
  'deep learning': 'AI models',
  'design': 'design', 'design tools': 'design',
  'descript': 'Descript',
  'digital marketing': 'marketing automation',
  'dropshipping': 'ecommerce',
  'ecommerce': 'ecommerce',
  'elevenlabs': 'AI tools',
  'essay writer': 'AI writing',
  'figma': 'design', 'figma ai': 'design',
  'firefly': 'AI image',
  'free': 'deals', 'free ai tools': 'deals',
  'future of ai': 'AI tools',
  'gemini': 'Gemini', 'gemini ai': 'Gemini',
  'generative ai': 'AI models',
  'google': 'AI tools', 'google ai': 'AI tools',
  'gpt': 'ChatGPT', 'gpt 4': 'ChatGPT', 'gpt4': 'ChatGPT',
  'grammarly': 'AI writing',
  'groq': 'AI models',
  'guide': 'guide',
  'hugging face': 'AI models',
  'how to': 'how-to', 'how-to': 'how-to',
  'image generation': 'AI image', 'image generator': 'AI image',
  'instagram': 'marketing automation',
  'internal linking': 'SEO',
  'jasper': 'Jasper', 'jasper ai': 'Jasper',
  'keyword research': 'SEO',
  'klaviyo': 'marketing automation', 'klaviyo ai': 'marketing automation',
  'langchain': 'AI development',
  'llm': 'AI models', 'llms': 'AI models',
  'machine learning': 'AI models',
  'marketing': 'marketing automation',
  'marketing automation': 'marketing automation',
  'midjourney': 'Midjourney',
  'ml': 'AI models',
  'monetization': 'ecommerce',
  'n8n': 'AI development',
  'natural language processing': 'AI models',
  'neural networks': 'AI models',
  'newsletter': 'marketing automation',
  'nordvpn': 'deals',
  'notion': 'Notion AI', 'notion ai': 'Notion AI',
  'nvidia': 'AI tools',
  'online course': 'AI tools',
  'openai': 'AI tools',
  'perplexity': 'Perplexity', 'perplexity ai': 'Perplexity',
  'pika': 'AI video', 'pika labs': 'AI video',
  'podcast': 'podcast', 'podcast transcription': 'AI transcription',
  'pricing': 'deals',
  'productivity': 'productivity', 'productivity tools': 'productivity',
  'programming': 'AI code',
  'prompt engineering': 'prompt engineering',
  'prompts': 'prompt engineering',
  'proton': 'deals',
  'rag': 'AI development',
  'review': 'review', 'reviews': 'review',
  'runway': 'Runway', 'runwayml': 'Runway',
  'rytr': 'Rytr',
  'saas': 'AI tools',
  'seo': 'SEO', 'seo tools': 'SEO',
  'sora': 'AI video',
  'stable diffusion': 'Stable Diffusion',
  'suno': 'AI tools', 'suno ai': 'AI tools',
  'surfer seo': 'Surfer SEO', 'surfer': 'Surfer SEO',
  'tech': 'tech',
  'tiktok': 'marketing automation',
  'transcription': 'AI transcription',
  'trends': 'tech',
  'tutorial': 'tutorial', 'tutorials': 'tutorial',
  'udio': 'AI tools',
  'veo': 'AI video',
  'video editing': 'video editing', 'video editing software': 'video editing',
  'video generator': 'AI video',
  'web scraping': 'AI development',
  'webflow': 'design',
  'writesonic': 'Writesonic',
  'youtube': 'AI video', 'youtube script': 'AI video',
  'zapier': 'AI development',
};

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  const fm = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let currentArr = [];
  for (const line of lines) {
    const arrMatch = line.match(/^(\w+):\s*\[(.*)\]/);
    if (arrMatch) {
      fm[arrMatch[1]] = arrMatch[2].split(',').map(s => s.trim().replace(/['"]/g, ''));
      continue;
    }
    const keyMatch = line.match(/^(\w+):\s*(.*)/);
    if (keyMatch && !line.startsWith(' ')) {
      if (currentKey && currentArr.length) {
        fm[currentKey] = currentArr;
        currentArr = [];
      }
      currentKey = keyMatch[1];
      const val = keyMatch[2].trim();
      if (val.startsWith('[')) {
        fm[currentKey] = val.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, ''));
        currentKey = null;
      } else if (val === '' || val === '|') {
      } else {
        fm[currentKey] = val;
        currentKey = null;
      }
    } else if (currentKey && line.trim().startsWith('- ')) {
      currentArr.push(line.trim().slice(2).replace(/['"]/g, ''));
    }
  }
  if (currentKey && currentArr.length) {
    fm[currentKey] = currentArr;
  }
  return { frontmatter: fm, body: match[2], raw: match[1] };
}

function normalizeTags(tags) {
  if (!tags || !Array.isArray(tags)) return [];
  const normalized = new Set();
  for (const tag of tags) {
    const lower = tag.toLowerCase().trim();
    if (CANONICAL_TAGS.has(tag.trim())) {
      normalized.add(tag.trim());
      continue;
    }
    if (TAG_MAP[lower]) {
      normalized.add(TAG_MAP[lower]);
      continue;
    }
    const multiWord = TAG_MAP[lower.replace(/\s+/g, ' ')];
    if (multiWord) {
      normalized.add(multiWord);
      continue;
    }
  }
  return [...normalized].sort((a, b) => a.localeCompare(b));
}

function buildRawFrontmatter(fm) {
  const lines = ['---'];
  for (const [key, val] of Object.entries(fm)) {
    if (Array.isArray(val)) {
      if (key === 'tags' && val.length > 10) {
        lines.push(`${key}:`);
        val.forEach(t => lines.push(`  - '${t}'`));
      } else {
        lines.push(`${key}: [${val.map(t => `'${t}'`).join(', ')}]`);
      }
    } else {
      lines.push(`${key}: ${val}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

let totalChanged = 0;
let totalTagsBefore = 0;
let totalTagsAfter = 0;

const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
for (const file of files) {
  const filepath = path.join(POSTS_DIR, file);
  let content = fs.readFileSync(filepath, 'utf-8');
  const parsed = parseFrontmatter(content);
  if (!parsed) continue;

  const oldTags = parsed.frontmatter.tags || [];
  totalTagsBefore += oldTags.length;

  const newTags = normalizeTags(oldTags);
  totalTagsAfter += newTags.length;

  if (JSON.stringify(oldTags) !== JSON.stringify(newTags)) {
    parsed.frontmatter.tags = newTags;
    const newFm = buildRawFrontmatter(parsed.frontmatter);
    const newContent = newFm + '\n' + parsed.body;
    fs.writeFileSync(filepath, newContent, 'utf-8');
    console.log(`✓ ${file}: ${oldTags.length}→${newTags.length} tags`);
    totalChanged++;
  }
}

const uniqueBefore = Object.keys(TAG_MAP).length;
const uniqueAfter = CANONICAL_TAGS.size;

console.log(`\nDone. ${totalChanged}/${files.length} files updated.`);
console.log(`Tags: ${totalTagsBefore} → ${totalTagsAfter} total`);
console.log(`Unique: ${uniqueBefore}→${uniqueAfter} controlled tags`);
