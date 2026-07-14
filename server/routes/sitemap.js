
import express from "express";
import db from "../db.js";

const router = express.Router();

router.get("/sitemap.xml", async (req, res) => {
  try {
    const movies = await db.query(
      `SELECT tmdb_id, id, last_verified_at
       FROM african_movies
       WHERE status = 'approved'
       ORDER BY last_verified_at DESC`
    );

    const baseUrl = "https://african-cinema.vercel.app";

    const urls = [
      // Static pages
      `<url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      `<url><loc>${baseUrl}/submit</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
      `<url><loc>${baseUrl}/contact</loc><changefreq>monthly</changefreq><priority>0.4</priority></url>`,

      // Dynamic movie pages
      ...movies.rows.map(m => {
        const id = m.tmdb_id || m.id;
        const lastmod = m.last_verified_at
          ? new Date(m.last_verified_at).toISOString().split("T")[0]
          : "2025-01-01";
        return `<url>
          <loc>${baseUrl}/movie/${id}</loc>
          <lastmod>${lastmod}</lastmod>
          <changefreq>monthly</changefreq>
          <priority>0.8</priority>
        </url>`;
      }),
    ].join("\n");

    res.setHeader("Content-Type", "application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/0.9">
${urls}
</urlset>`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Sitemap generation failed");
  }
});

export default router;