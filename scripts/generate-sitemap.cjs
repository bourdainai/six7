const fs = require('fs');
const path = require('path');

// Optimized sitemap with proper priorities and only public pages
const routes = [
    // High priority public pages
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/browse', priority: '0.9', changefreq: 'daily' },
    { url: '/sell', priority: '0.8', changefreq: 'weekly' },

    // Medium priority public pages
    { url: '/bundles', priority: '0.7', changefreq: 'weekly' },
    { url: '/help', priority: '0.7', changefreq: 'monthly' },
    { url: '/changelog', priority: '0.6', changefreq: 'weekly' },

    // Legal/Policy pages
    { url: '/terms', priority: '0.3', changefreq: 'monthly' },
    { url: '/privacy', priority: '0.3', changefreq: 'monthly' },
    { url: '/returns', priority: '0.3', changefreq: 'monthly' },
    { url: '/cookies', priority: '0.3', changefreq: 'monthly' },
];

// Note: Removed auth-required pages (orders, messages, saved, dashboard, admin, settings, wallet, trade-offers)
// Note: Removed placeholder dynamic routes with /123 - these should be generated from actual data

const baseUrl = 'https://6seven.io';
const today = new Date().toISOString().split('T')[0];

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
`;

routes.forEach(route => {
    xml += `  <url>
    <loc>${baseUrl}${route.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
});

xml += '</urlset>';

fs.writeFileSync(path.join(__dirname, '..', 'public', 'sitemap.xml'), xml, 'utf8');
console.log(`✅ Sitemap generated with ${routes.length} optimized URLs`);
