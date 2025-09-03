// generateSitemap.js
// Generates sitemap.xml for Three-Sided

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('../three-sided-flashcard-app-firebase-adminsdk-fbsvc-2aa116656d.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const BASE_URL = 'https://three-sided.com';
const STATIC_PAGES = [
  '/',
  '/search.html',
  '/cheatsheet.html',
  '/sr.html',
  '/friends.html',
  '/updates.html',
  '/create-profile.html',
  '/social.html'
];

function xmlEscape(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function generateSitemap() {
  let urls = [];
  const today = new Date().toISOString().slice(0, 10);

  // Add static pages
  for (const page of STATIC_PAGES) {
    urls.push({
      loc: `${BASE_URL}${page}`,
      lastmod: today,
      changefreq: 'monthly',
      priority: page === '/' ? '1.0' : '0.7'
    });
  }

  // Add all public profiles
  const profilesSnap = await db.collection('profiles').get();
  profilesSnap.forEach(doc => {
    urls.push({
      loc: `${BASE_URL}/profile/${encodeURIComponent(doc.id)}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8'
    });
  });

  // Add all public cards
  const cardsSnap = await db.collection('publicCards').get();
  cardsSnap.forEach(doc => {
    urls.push({
      loc: `${BASE_URL}/card/${encodeURIComponent(doc.id)}`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.5'
    });
  });

  // Build XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u =>
      `  <url>\n` +
      `    <loc>${xmlEscape(u.loc)}</loc>\n` +
      `    <lastmod>${u.lastmod}</lastmod>\n` +
      `    <changefreq>${u.changefreq}</changefreq>\n` +
      `    <priority>${u.priority}</priority>\n` +
      `  </url>`
    ).join('\n') +
    '\n</urlset>\n';

  // Write to public/sitemap.xml
  const outPath = path.join(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log(`Sitemap generated with ${urls.length} URLs at ${outPath}`);
}

generateSitemap().catch(err => {
  console.error('Error generating sitemap:', err);
  process.exit(1);
}); 