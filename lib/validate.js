const VALID_CATEGORIES = [
  'AI News', 'AI Tools', 'Best Of', 'Comparisons', 'Reviews', 'Tutorials',
  'AI Chatbots', 'AI Image Generation', 'AI Notes', 'AI Podcast', 'AI Search',
  'AI Video', 'AI Writing',
];

const RULES = {
  title: { required: true, maxLength: 120 },
  date: { pattern: /^\d{4}-\d{2}-\d{2}$/ },
  lastUpdated: { pattern: /^\d{4}-\d{2}-\d{2}$/ },
  category: { allowed: VALID_CATEGORIES },
  tags: { isArray: true },
  draft: { type: 'boolean' },
  seoScore: { type: 'number', min: 0, max: 100 },
  excerpt: { maxLength: 250 },
  cover: { type: 'string' },
};

export function validateFrontmatter(fields) {
  const errors = [];
  for (const [key, value] of Object.entries(fields)) {
    const rule = RULES[key];
    if (!rule) continue;
    if (rule.allowed && value && !rule.allowed.includes(value)) {
      errors.push(`"${key}" must be one of: ${rule.allowed.join(', ')} (got "${value}")`);
    }
    if (rule.type === 'number' && value !== undefined && value !== null && value !== '') {
      const num = Number(value);
      if (isNaN(num)) errors.push(`"${key}" must be a number (got "${value}")`);
      else if (rule.min !== undefined && num < rule.min) errors.push(`"${key}" must be >= ${rule.min} (got ${num})`);
      else if (rule.max !== undefined && num > rule.max) errors.push(`"${key}" must be <= ${rule.max} (got ${num})`);
    }
    if (rule.type === 'boolean' && value !== undefined && value !== null && value !== '') {
      if (!['true', 'false', true, false].includes(value)) errors.push(`"${key}" must be true or false (got "${value}")`);
    }
    if (rule.pattern && value && !rule.pattern.test(value)) {
      errors.push(`"${key}" format invalid (got "${value}", expected ${rule.pattern})`);
    }
    if (rule.maxLength && value && value.length > rule.maxLength) {
      errors.push(`"${key}" too long (${value.length}/${rule.maxLength})`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export { VALID_CATEGORIES };
