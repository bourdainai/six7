const fs = require('fs');
const path = require('path');

// Simple list of static routes (could be generated dynamically)
const routes = [
    '/',
    '/sell',
    '/browse',
    '/orders',
    '/messages',
    '/membership',
    '/saved',
    '/bundles',
    '/dashboard/seller',
    '/admin',
    '/admin/analytics',
    '/admin/live',
    '/admin/disputes',
    '/admin/restore-cards',
    '/admin/shipping',
    '/admin/moderation',
    '/admin/fraud',
    '/terms',
    '/privacy',
    '/returns',
    '/cookies',
    '/help',
    '/settings/notifications',
    '/settings/api-keys',
    '/docs/mcp',
    '/wallet',
    '/trade-offers',
    '/changelog',
];

const baseUrl = 'https://6seven.ai';
const today = new Date().toISOString().split('T')[0];

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n`;

routes.forEach(route => {
    xml += `  <url>\n    <loc>${baseUrl}${route}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
});

// Add placeholder dynamic routes
const dynamic = [
    '/listing/123',
    '/checkout/123',
    '/bundle/123',
    '/seller/123',
];

dynamic.forEach(route => {
    xml += `  <url>\n    <loc>${baseUrl}${route}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
});

xml += '</urlset>';

fs.writeFileSync(path.join(__dirname, '..', 'public', 'sitemap.xml'), xml, 'utf8');
console.log('sitemap.xml generated');
