//server/routes/african.js --- main API routes for African cinema data, including top-rated, latest releases, featured film, search, and community submissions.
import express from "express";
import axios from "axios";

import db from "../db.js";

import { verifyToken,} from "../middleware/auth.js";

import { fetchAfricanMovies, getCountryCodes, } from "../helpers/africanHelpers.js";

import {AFRICAN_COUNTRIES_ARRAY,} from "../config/africanCountries.js";
import pool from "../db.js";

const router = express.Router();

function getTabRegions(tab) {
  const TAB_MAP = {
    all:  null, // no filter — all regions
    NG:   ["NG"],
    CM:   ["CM"],
    GH:   ["GH"],
    ZA:   ["ZA"],
    ARAB: ["EG", "DZ", "MA", "TN"],
    FR:   ["SN", "ML", "CI", "GN", "TD", "CD", "NE", "MR"],
  };
  return TAB_MAP[tab] ?? null;
}
// ── TOP-RATED AFRICAN MOVIES ───────────────────────────────
router.get("/african/top-rated", async (req, res) => {
  try {
    const { tab = "all", period = "year" } = req.query;
    const regions = getTabRegions(tab);

    // Build date filter for period
    let dateFilter = "";
    const now = new Date();
    if (period === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split("T")[0];
      dateFilter = `AND release_date >= '${firstDay}'`;
    } else if (period === "year") {
      dateFilter = `AND release_year = ${now.getFullYear()}`;
    }
    // "all" period — no date filter

    // Build region filter
    let regionFilter = "";
    const regionParams = [];
    if (regions) {
      const placeholders = regions.map((_, i) => `$${i + 1}`).join(", ");
      regionFilter = `AND tab_region IN (${placeholders})`;
      regionParams.push(...regions);
    }

    const query = `
      SELECT
        id, tmdb_id, title, release_date, release_year,
        poster_path, backdrop_path, vote_average, vote_count,
        genres, director, origin_country, tab_region,
        confidence_score, trailer_key
      FROM african_movies
      WHERE status = 'approved'
        AND vote_count > 0
        ${dateFilter}
        ${regionFilter}
      ORDER BY confidence_score DESC, vote_average DESC
      LIMIT ${tab === "NG" ? 60 : 25}
    `;

    const result = await db.query(query, regionParams);

    res.json({ movies: result.rows, total: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch top rated" });
  }
});


// ── LATEST AFRICAN RELEASES last 18 months ───────────────────────────────
router.get("/african/latest", async (req, res) => {
  try {
    const { tab = "all", page = 1 } = req.query;
    const regions = getTabRegions(tab);
    const limit = 20;
    const offset = (parseInt(page) - 1) * limit;

    // Latest = released within last 18 months
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 18);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    let regionFilter = "";
    const params = [cutoffStr];

    if (regions) {
      const placeholders = regions.map((_, i) => `$${i + 2}`).join(", ");
      regionFilter = `AND tab_region IN (${placeholders})`;
      params.push(...regions);
    }

    const offsetParam = `$${params.length + 1}`;
    const limitParam  = `$${params.length + 2}`;
    params.push(offset, limit);

    const countQuery = `
      SELECT COUNT(*) FROM african_movies
      WHERE status = 'approved'
        AND release_date >= $1
        ${regionFilter}
    `;
    const countResult = await db.query(countQuery, params.slice(0, params.length - 2));
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT
        id, tmdb_id, title, release_date, release_year,
        poster_path, backdrop_path, vote_average, vote_count,
        genres, director, origin_country, tab_region,
        confidence_score, trailer_key
      FROM african_movies
      WHERE status = 'approved'
        AND release_date >= $1
        ${regionFilter}
      ORDER BY release_date DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const result = await db.query(query, params);

    res.json({
      movies:      result.rows,
      total,
      total_pages: Math.ceil(total / limit),
      page:        parseInt(page),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch latest releases" });
  }
});

// ── FEATURED AFRICAN FILM (hero) ───────────────────────────
router.get("/african/featured", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
        id, tmdb_id, title, synopsis, release_date, release_year,
        poster_path, backdrop_path, trailer_key, vote_average, vote_count,
        genres, director, origin_country, tab_region, confidence_score
       FROM african_movies
       WHERE status      = 'approved'
         AND backdrop_path IS NOT NULL
         AND trailer_key   IS NOT NULL
         AND confidence_score >= 4
       ORDER BY RANDOM()
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No featured film available" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch featured film" });
  }
});
// ── AFRICAN MOVIE SEARCH ─────────────────────────────────  
router.get("/african/search", async (req, res) => {
  try {
    const { q, page = 1 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ movies: [] });
    }

    // Search local DB
    const localResults = await db.query(
      `
      SELECT
        tmdb_id,
        title,
        original_title,
        synopsis,
        release_date,
        release_year,
        vote_average,
        vote_count,
        poster_path,
        backdrop_path,
        origin_country,
        original_language,
        genres
      FROM african_movies
      WHERE
        status = 'published'
        AND (
          title ILIKE $1
          OR original_title ILIKE $1
        )
      ORDER BY
        confidence_score DESC,
        vote_average DESC,
        vote_count DESC
      LIMIT 20
      `,
      [`%${q.trim()}%`]
    );

    if (localResults.rows.length > 0) {
      return res.json({
        source: "database",
        movies: localResults.rows,
        total_results: localResults.rows.length,
      });
    }

    // Fallback to TMDB
    const response = await axios.get(
      "https://api.themoviedb.org/3/search/movie",
      {
        params: {
          query: q.trim(),
          language: "en-US",
          include_adult: false,
          page,
        },
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${process.env.TMDB_BEARER}`,
        },
      }
    );

    return res.json({
      source: "tmdb",
      movies: response.data.results,
      total_results: response.data.total_results,
    });

  } catch (err) {
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      message: "Search failed",
    });
  }
});

//SUBMISSION ROUTES

// ── CHECK IF USER CAN SUBMIT (logged-in users) ─────────────
router.get("/african/can-submit", verifyToken, async (_req, res) => {
  res.json({
    canSubmit: true,
    movieCount: 0,
    required: 0,
  });
});

// ── CHECK FOR TMDB DUPLICATE BEFORE SUBMISSION ─────────────
router.get("/african/check-duplicate", verifyToken, async (req, res) => {
  const { title, year } = req.query;
  if (!title) return res.json({ found: false });

  try {
    // Check our own african_movies table first
    const localCheck = await db.query(
      `SELECT id, title, release_year, source, status
       FROM african_movies
       WHERE title ILIKE $1
       AND ($2::integer IS NULL OR release_year = $2)`,
      [title.trim(), year || null]
    );

    if (localCheck.rows.length > 0) {
      return res.json({
        found: true,
        source: "local",
        movie: localCheck.rows[0],
      });
    }

    // Check TMDB
    const tmdbRes = await axios.get(
      "https://api.themoviedb.org/3/search/movie",
      {
        params: { query: title, year, include_adult: false, language: "en-US" },
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${process.env.TMDB_BEARER}`,
        },
      }
    );

    const tmdbResults = tmdbRes.data.results.slice(0, 3);

    res.json({
      found: tmdbResults.length > 0,
      source: "tmdb",
      movies: tmdbResults,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Duplicate check failed" });
  }
});

// ── SUBMIT A COMMUNITY MOVIE ───────────────────────────────
router.post("/african/submit", verifyToken, async (req, res) => {
  try {
    // Check eligibility — 10+ movies required
    const countResult = await db.query(
      "SELECT COUNT(*) FROM movies WHERE user_id = $1",
      [req.user.id]
    );
    const movieCount = parseInt(countResult.rows[0].count);

    if (movieCount < 10) {
      return res.status(403).json({
        message: `You need at least 10 movies in your list to submit. You have ${movieCount}.`,
      });
    }

    const {
      title,
      original_title,
      origin_country,
      original_language,
      release_year,
      release_date,
      poster_url,
      backdrop_url,
      synopsis,
      director,
      cast_list,
      genres,
      runtime,
      trailer_url,
      streaming_links,
    } = req.body;

    // Validate required fields
    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!origin_country) {
      return res.status(400).json({ message: "Country of origin is required" });
    }
    if (!release_year) {
      return res.status(400).json({ message: "Release year is required" });
    }
    if (!synopsis?.trim()) {
      return res.status(400).json({ message: "Synopsis is required" });
    }

    // Check for duplicate submission from same user
    const dupCheck = await db.query(
      `SELECT id FROM african_submissions
       WHERE submitted_by = $1
       AND title ILIKE $2
       AND status = 'pending'`,
      [req.user.id, title.trim()]
    );

    if (dupCheck.rows.length > 0) {
      return res.status(400).json({
        message: "You already have a pending submission for this title",
      });
    }

    const result = await db.query(
      `INSERT INTO african_submissions (
        title, original_title, origin_country, original_language,
        release_year, release_date, poster_url, backdrop_url,
        synopsis, director, cast_list, genres, runtime,
        trailer_url, streaming_links, submitted_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING id`,
      [
        title.trim(),
        original_title?.trim() || null,
        origin_country,
        original_language || null,
        parseInt(release_year),
        release_date || null,
        poster_url || null,
        backdrop_url || null,
        synopsis.trim(),
        director?.trim() || null,
        cast_list || null,
        genres || null,
        runtime ? parseInt(runtime) : null,
        trailer_url?.trim() || null,
        JSON.stringify(streaming_links || []),
        req.user.id,
      ]
    );

    res.status(201).json({
      success: true,
      submissionId: result.rows[0].id,
      message: "Submission received! It will be reviewed by our team.",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Submission failed" });
  }
});

// ── GET USER'S OWN SUBMISSIONS ─────────────────────────────
router.get("/african/my-submissions", verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, origin_country, release_year, poster_url,
              status, admin_notes, created_at
       FROM african_submissions
       WHERE submitted_by = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load submissions" });
  }
});

// ── GET MOVIE DETAILS BY TMDB ID ─────

router.get("/african/movie/:tmdbId", async (req, res) => {
  try {
    const { tmdbId } = req.params;

    // Try your own database first — instant, no external dependency
    const dbResult = await db.query(
      `SELECT * FROM african_movies WHERE tmdb_id = $1`,
      [parseInt(tmdbId)]
    );

    if (dbResult.rows.length > 0) {
      const movie = dbResult.rows[0];
      return res.json({
        id:                movie.tmdb_id,
        tmdbId:            movie.tmdb_id,
        title:             movie.title,
        original_title:    movie.original_title,
        synopsis:          movie.synopsis,
        release_date:      movie.release_date,
        runtime:           movie.runtime,
        vote_average:      movie.vote_average,
        vote_count:        movie.vote_count,
        genres:            movie.genres || [],
        poster_path:       movie.poster_path,
        backdrop_path:     movie.backdrop_path,
        origin_country:    movie.origin_country ? [movie.origin_country] : [],
        original_language: movie.original_language,
        cast:              (movie.cast_list || []).map(name => ({ name, character: "" })),
        director:          movie.director,
        trailerKey:        movie.trailer_key,
      });
    }

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(404).json({ message: "Movie not found" });
  }
});
export default router;