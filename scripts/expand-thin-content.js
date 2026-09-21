#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { generate, hasKey } = require('./ai-agent');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const MIN_WORDS = 1000;
const TARGET_WORDS = 1500;
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const useAI = args.includes('--ai');

function parseFrontmatter(content) {
  const get = (k) => (content.match(new RegExp(`^${k}:\\s*"?([^"\n]*)"?`, 'm')) || [])[1] || '';
  return { title: get('title'), excerpt: get('excerpt'), tags: get('tags'), category: get('category') };
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function getBody(content) {
  const parts = content.split('---');
  return parts.slice(2).join('---').trim();
}

function detectType(title, category, tags) {
  const lower = `${title} ${category} ${tags}`.toLowerCase();
  if (lower.includes('best ') || lower.includes('top ')) return 'list';
  if (lower.includes('how to ') || lower.includes('tutorial')) return 'tutorial';
  if (lower.includes('review')) return 'review';
  if (lower.includes('comparison') || lower.includes(' vs ')) return 'comparison';
  if (lower.includes('guide')) return 'tutorial';
  if (lower.includes('monitor') || lower.includes('keyboard') || lower.includes('headphone') || lower.includes('chair') || lower.includes('ssd') || lower.includes('tablet') || lower.includes('webcam') || lower.includes('smart home') || lower.includes('laptop')) return 'product';
  return 'general';
}

function buildExpansion(postType, title, body) {
  const hasFaq = body.includes('## FAQ') || body.includes('## Frequently Asked');
  const hasTips = body.includes('## Tips') || body.includes('## Pro Tips') || body.includes('## Best Practices');
  const bodyLower = body.toLowerCase();
  const expansions = [];

  switch (postType) {
    case 'tutorial': {
      if (!hasTips) {
        expansions.push(`\n\n## Tips for Getting the Most Out of ${title.replace(/\(2026( Guide)?\)|\(2026\)/g, '').trim()}\n\nTo get the best results, start with clear goals for what you want to achieve. Experiment with different settings and approaches to find what works for your specific use case. Track your results over time and adjust your strategy based on what the data tells you.\n\nOne common approach is to test multiple variations of your prompts and compare the output quality. Keep a log of what works and what doesn't so you can refine your process. As you gain experience, you will develop intuitions about which techniques work best for different scenarios.`);
      }
      expansions.push(`\n\n## Common Mistakes to Avoid\n\nMany beginners make the mistake of expecting perfect results on the first try. AI tools require experimentation and iteration. Avoid using overly complex prompts when simple ones would work better. Do not rely on a single tool for everything -- different tools excel at different tasks. Finally, remember to always review and edit AI-generated output before publishing or using it in production.`);
      break;
    }
    case 'review': {
      expansions.push(`\n\n## Who Is This For?\n\n${title.replace(/\(2026( Guide)?\)|\(2026\)/g, '').trim()} is ideal for professionals who want to streamline their workflow and save time on repetitive tasks. Small business owners will find the pricing and feature set attractive. Content creators and marketers looking to scale their output will benefit most from the advanced capabilities.\n\nHowever, if you are looking for a completely hands-off solution, this may not be the right fit. The tool works best when users actively guide and refine the output rather than expecting fully automated results.\n\n### Alternatives Worth Considering\n\nThe market offers several competing solutions worth evaluating. Each has its own strengths depending on your specific needs and priorities. Consider trying multiple options during their trial periods to see which workflow feels most natural to you.\n\n### Pricing Overview\n\nPricing structures vary across different providers. Some charge a flat monthly fee while others use usage-based pricing. Consider your expected volume when evaluating costs, as what appears cheaper at first may become more expensive with heavy use.`);
      if (!hasFaq) {
        expansions.push(`\n\n## Frequently Asked Questions\n\n**Is there a free trial available?** Most AI tools in this category offer a free trial or a freemium version so you can test before committing.\n\n**Can I use it with my existing workflow?** Many tools integrate with popular platforms through APIs or direct integrations.\n\n**What level of support is available?** Support options typically range from documentation and community forums to email and live chat, depending on your plan.`);
      }
      break;
    }
    case 'comparison': {
      expansions.push(`\n\n## Which One Should You Choose?\n\nYour choice depends on your specific needs and priorities. If budget is your main concern, the more affordable option may be sufficient for basic tasks. If you need advanced features and don't mind paying a premium, the higher-end tool offers more capabilities.\n\nConsider your team size, technical expertise, and integration requirements when making a decision. Most tools offer free trials, so testing a few options before committing is always recommended.\n\n### Decision Matrix\n\n**For beginners:** Start with the most user-friendly and affordable option. You can always upgrade later as your needs grow.\n\n**For professionals:** Look for advanced features and customization options. The extra cost is often justified by productivity gains.\n\n**For teams:** Consider collaboration features, team pricing, and admin controls. The best individual tool may not be the best team tool.`);
      break;
    }
    case 'list': {
      expansions.push(`\n\n## How to Choose the Right Tool for You\n\nWith so many options, the key is matching the tool to your specific use case. Start by defining your must-have features versus nice-to-haves. Consider your budget, team size, and technical comfort level. Most tools offer free tiers or trials — use them to test real workflows before committing.\n\n### Quick Decision Guide\n\n**Just starting out?** Look for the most generous free tier and simplest UI. You can always upgrade later.\n\n**Scaling up?** Prioritize tools with team features, API access, and volume discounts.\n\n**Need specific integrations?** Check the integration directory before buying — native integrations save massive time.\n\n**Privacy-conscious?** Look for on-premise or self-hosted options, or tools with strong data processing agreements.`);
      break;
    }
    case 'product': {
      expansions.push(`\n\n## Buying Considerations\n\nWhen evaluating ${title.replace(/\(2026( Guide)?\)|\(2026\)/g, '').trim()}, focus on the specs that matter for your workflow. Don't get distracted by marketing numbers — real-world performance depends on how the tool fits your daily tasks.\n\n**Key questions to ask:**\n- Does it integrate with my existing stack?\n- What's the learning curve for my team?\n- Is there a trial or money-back guarantee?\n- How responsive is support when things break?`);
      break;
    }
    default: {
      expansions.push(`\n\n## Next Steps\n\nNow that you understand the landscape, the best approach is to narrow your list to 2-3 options and test them with your actual use cases. Most tools offer free trials — use them to run real workflows, not just demos.\n\nTrack your time, output quality, and any friction points. The tool that feels most natural after a week of real use is usually the right long-term choice.`);
    }
  }

  return expansions.join('\n');
}

async function aiExpansion(postType, title, body) {
  const prompt = `You are expanding a short blog post about "${title}" (type: ${postType}).

Current body:
${body.slice(0, 3000)}

Write 2 new markdown sections (300-500 words total) that add genuine value to this specific post:
- Use ## headings, specific to this exact topic — no generic filler
- Reference the actual tools/claims already in the post where relevant
- Match the post's existing tone and depth; no AI clichés ("in today's fast-paced world", "unlock", "game-changer")
- One section should be practical (steps, criteria, mistakes, or a concrete example), one can be forward-looking

Return ONLY the new markdown sections (with ## headings), no preamble, no code fences.`;

  return await generate(prompt, { temperature: 0.6, maxTokens: 2048 });
}

function insertBefore(content, section) {
  const lastSection = content.lastIndexOf('##');
  if (lastSection === -1) return content + section;
  const beforeLastSection = content.slice(0, lastSection);
  const afterLastSection = content.slice(lastSection);
  return beforeLastSection + section + '\n' + afterLastSection;
}

(async () => {
  console.log(`📖 Thin Content Expander (${dryRun ? 'DRY RUN' : 'LIVE'})`);
  console.log(`   Target: ${TARGET_WORDS}+ words per post\n`);

  if (useAI && !hasKey()) {
    console.log('⚠️ --ai flag used but no AI API key found. Falling back to rule-based.\n');
  }

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  let expanded = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(POSTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = parseFrontmatter(content);
    const body = getBody(content);
    const wc = wordCount(body);

    if (wc >= MIN_WORDS) { skipped++; continue; }

    const postType = detectType(fm.title, fm.category, fm.tags);

    let expansion;
    if (useAI && hasKey()) {
      expansion = await aiExpansion(postType, fm.title, body);
      if (!expansion || wordCount(expansion) < 30) {
        expansion = buildExpansion(postType, fm.title, body);
      }
    } else {
      expansion = buildExpansion(postType, fm.title, body);
    }

    if (wc + wordCount(expansion) < TARGET_WORDS && !body.includes('## FAQ') && !body.includes('## Frequently Asked')) {
      expansion += `\n\n## Frequently Asked Questions\n\n**What is ${fm.title.replace(/\(2026( Guide)?\)|\(2026\)|:\s*$/g, '').trim()}?** This guide covers everything you need to know to get started and make the most of the technology.\n\n**How much does it cost?** Pricing varies depending on the tool or platform. Most offer free tiers or trials for testing.\n\n**Is it suitable for beginners?** Yes, most tools are designed with user-friendly interfaces that make them accessible to newcomers while offering advanced features for experienced users.`;
    }

    if (dryRun) {
      console.log(`📄 ${fm.title} (${wc}w → ${wc + wordCount(expansion)}w, ${postType})`);
      continue;
    }

    const updatedBody = insertBefore(body, expansion);
    const newContent = content.replace(body, updatedBody);
    fs.writeFileSync(filePath, newContent);
    const newWc = wordCount(newContent.split('---').slice(2).join('---').trim());
    expanded++;
    console.log(`✅ ${fm.title}: ${wc} → ${newWc} words (${postType})`);
  }

  console.log(`\nDone: ${expanded} expanded, ${skipped} skipped (already ≥${MIN_WORDS} words)`);
})();