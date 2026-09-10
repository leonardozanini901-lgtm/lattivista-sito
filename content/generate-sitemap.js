#!/usr/bin/env node
/**
 * generate-sitemap.js
 *
 * Genera sitemap.xml a partire da articles.json + pagine statiche fisse.
 * Da eseguire ogni volta che pubblichi un nuovo articolo (o via script/cron/CI).
 *
 * Uso:
 *   node generate-sitemap.js
 *
 * Configurazione: modifica le costanti qui sotto.
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURAZIONE ====================
// Sostituisci con il dominio reale del sito (senza slash finale)
const SITE_URL = 'https://www.lattivista.it';

// Percorso del file articles.json rispetto a questo script
const ARTICLES_JSON_PATH = path.join(__dirname, 'articles.json');

// Percorso di output della sitemap
const OUTPUT_PATH = path.join(__dirname, 'sitemap.xml');

// Pagine statiche del sito (oltre agli articoli), con priorità e frequenza di modifica
const STATIC_PAGES = [
  { url: '/', changefreq: 'daily', priority: '1.0' },
  { url: '/index.html', changefreq: 'daily', priority: '1.0' },
  { url: '/manifesto.html', changefreq: 'monthly', priority: '0.8' },
];

// Template dell'URL articolo. Se articolo.html usa query string (?id=slug),
// lascia questo formato. Se invece usi URL puliti tipo /articoli/slug,
// cambia in: `/articoli/${slug}`
function buildArticleUrl(article) {
  const slug = article.slug || article.id;
  return `/articolo.html?id=${encodeURIComponent(slug)}`;
}

// Campo data dell'articolo da usare come <lastmod>. Adatta al tuo schema
// (es. 'date', 'publishedAt', 'updatedAt')
function getArticleDate(article) {
  return article.date || article.publishedAt || article.updatedAt || null;
}
// ==========================================================

function formatDate(dateInput) {
  if (!dateInput) return new Date().toISOString().split('T')[0];
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
}

function escapeXml(unsafe) {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function loadArticles() {
  if (!fs.existsSync(ARTICLES_JSON_PATH)) {
    console.warn(`Attenzione: ${ARTICLES_JSON_PATH} non trovato. Genero sitemap solo con pagine statiche.`);
    return [];
  }
  const raw = fs.readFileSync(ARTICLES_JSON_PATH, 'utf-8');
  const data = JSON.parse(raw);
  // Supporta sia un array diretto sia un oggetto { articles: [...] }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.articles)) return data.articles;
  console.warn('Formato articles.json non riconosciuto: attesi un array o { articles: [...] }');
  return [];
}

function buildSitemap() {
  const articles = loadArticles();
  const today = formatDate(new Date());

  const staticEntries = STATIC_PAGES.map((page) => `  <url>
    <loc>${escapeXml(SITE_URL + page.url)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);

  const articleEntries = articles.map((article) => {
    const url = escapeXml(SITE_URL + buildArticleUrl(article));
    const lastmod = formatDate(getArticleDate(article));
    return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...articleEntries].join('\n')}
</urlset>
`;

  fs.writeFileSync(OUTPUT_PATH, xml, 'utf-8');
  console.log(`Sitemap generata: ${OUTPUT_PATH}`);
  console.log(`Pagine statiche: ${staticEntries.length} | Articoli: ${articleEntries.length}`);
}

buildSitemap();
