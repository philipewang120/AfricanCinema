import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const sitemapPath = path.resolve(__dirname, "../../client/public/sitemap.xml");

export async function generateSitemap() {
  await db.query("SELECT 1");
  console.log("[Sitemap] ✓ DB connected");

  const movies = await db.query(`
    SELECT tmdb_id, id, last_verified_at
    FROM african_movies
    WHERE status = 'approved'
    ORDER BY last_verified_at DESC
  `);

  const baseUrl = "https://african-cinema.vercel.app";

  const staticUrls = [
    {
      loc: `${baseUrl}/`,
      priority: "1.0",
      changefreq: "daily",
    },
    {
      loc: `${baseUrl}/submit`,
      priority: "0.5",
      changefreq: "monthly",
    },
    {
      loc: `${baseUrl}/contact`,
      priority: "0.4",
      changefreq: "monthly",
    },
  ];

  const movieUrls = movies.rows.map((movie) => ({
    loc: `${baseUrl}/movie/${movie.tmdb_id || movie.id}`,
    lastmod: movie.last_verified_at
      ? new Date(movie.last_verified_at).toISOString().split("T")[0]
      : undefined,
    priority: "0.8",
    changefreq: "monthly",
  }));

  const allUrls = [...staticUrls, ...movieUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  fs.writeFileSync(sitemapPath, xml, "utf8");

  console.log(`[Sitemap] ✓ Generated ${allUrls.length} URLs`);
  console.log(`[Sitemap] ✓ ${movies.rows.length} movie pages`);

  return allUrls.length;
}

// Allows:
// node server/scripts/generateSitemap.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateSitemap()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Sitemap] Failed:", err);
      process.exit(1);
    });
}