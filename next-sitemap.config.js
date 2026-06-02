module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com',
  generateRobotsTxt: false, // we ship our own GEO-optimized robots.txt in /public
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  // Add custom paths that next-sitemap might not auto-discover
  exclude: ['/api/*', '/admin/*', '/private/*'],
  robotsTxtOptions: { policies: [{ userAgent: '*', allow: '/' }] },
};
