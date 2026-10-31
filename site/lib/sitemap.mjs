// Sitemaps dated by data (site/discoverability, "Sitemaps dated by data"):
// index and part files of at most 50,000 URLs, each lastmod the newest as-of
// date of the data its page shows, so a rebuild with unchanged data changes
// nothing. robots.txt allows every crawler and names the index.

export const URLS_PER_FILE = 50_000;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/**
 * @param {Array<{path: string, lastmod: string}>} pages published pages, each with a YYYY-MM-DD date
 * @param {string} origin such as https://gridprims.com
 * @returns {{files: Record<string, string>}} file path to XML, the index at sitemap.xml
 */
export function sitemaps(pages, origin) {
  const sorted = [...pages].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const parts = [];
  for (let i = 0; i < sorted.length; i += URLS_PER_FILE) parts.push(sorted.slice(i, i + URLS_PER_FILE));
  const files = {};
  parts.forEach((part, i) => {
    files[`sitemaps/sitemap-${i + 1}.xml`] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${part.map((p) => `<url><loc>${esc(origin + p.path)}</loc><lastmod>${p.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  });
  const newest = (part) => part.reduce((m, p) => (p.lastmod > m ? p.lastmod : m), '0000-00-00');
  files['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${parts.map((part, i) => `<sitemap><loc>${origin}/sitemaps/sitemap-${i + 1}.xml</loc><lastmod>${newest(part)}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`;
  return { files };
}

export const robotsTxt = (origin) => `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
