import { siteConfig } from './config';

// Build JSON-LD schema graph for any page — drives rich results + GEO (AI engines love structured data)
export function articleJsonLd(post, url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.description || post.title,
    author: { '@type': 'Person', name: post.author || siteConfig.author, url: siteConfig.url },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
      logo: { '@type': 'ImageObject', url: `${siteConfig.url}/logo.svg` },
    },
    datePublished: post.date,
    dateModified: post.lastUpdated || post.date,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: post.cover ? [{ '@type': 'ImageObject', url: post.cover, width: 1200, height: 630 }] : [`${siteConfig.url}/og-default.svg`],
    articleSection: post.category,
    keywords: (post.tags || []).join(', '),
  };
}

export function newsArticleJsonLd(post, url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.excerpt || post.description || post.title,
    author: { '@type': 'Person', name: post.author || siteConfig.author, url: siteConfig.url },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
      logo: { '@type': 'ImageObject', url: `${siteConfig.url}/logo.svg` },
    },
    datePublished: post.date,
    dateModified: post.lastUpdated || post.date,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: post.cover ? [{ '@type': 'ImageObject', url: post.cover, width: 1200, height: 630 }] : [`${siteConfig.url}/og-default.svg`],
    articleSection: post.category,
    keywords: (post.tags || []).join(', '),
    wordCount: post.content ? post.content.trim().split(/\s+/).length : undefined,
    inLanguage: 'en-US',
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.key-takeaways', '.quick-answer'] },
  };
}

export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function faqJsonLd(faqs) {
  if (!faqs || !faqs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function howtoJsonLd(steps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: steps.name,
    description: steps.description,
    step: steps.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text })),
  };
}

export function productReviewJsonLd(product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    brand: { '@type': 'Brand', name: product.brand || product.name },
    aggregateRating: product.rating ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating.value,
      reviewCount: product.rating.count,
      bestRating: 5,
    } : undefined,
    offers: product.price ? {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: product.url,
    } : undefined,
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.svg`,
    sameAs: Object.values(siteConfig.social),
    contactPoint: { '@type': 'ContactPoint', email: siteConfig.email, contactType: 'customer support' },
  };
}
