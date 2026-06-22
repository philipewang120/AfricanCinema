//server/routes/african.js --- main API routes for African cinema data, including top-rated, latest releases, featured film, search, and community submissions.
import express from "express";
import axios from "axios";

import db from "../db.js";

import { verifyToken,} from "../middleware/auth.js";

import { fetchAfricanMovies, getCountryCodes, } from "../helpers/africanHelpers.js";

import {AFRICAN_COUNTRIES_ARRAY,} from "../config/africanCountries.js";

const router = express.Router();

router.get("/african/top-rated", async (req, res) => {
  try {
    const { country = "all", period = "year", page = 1 } = req.query;
    const countryCodes = getCountryCodes(country);
    const now = new Date();

    const tmdbParams = {
      language:         "en-US",
      sort_by:          "vote_average.desc",
      "vote_count.gte": 1,
      include_adult:    false,
      page,
    };

    if (period === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      tmdbParams["primary_release_date.gte"] = firstDay.toISOString().split("T")[0];
      tmdbParams["primary_release_date.lte"] = now.toISOString().split("T")[0];
    } else if (period === "year") {
      tmdbParams["primary_release_date.gte"] = `${now.getFullYear()}-01-01`;
      tmdbParams["primary_release_date.lte"] = now.toISOString().split("T")[0];
    }
    // "all" period — no date filter

    const data = await fetchAfricanMovies(tmdbParams, countryCodes);
    res.json(data);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "Failed to fetch top rated" });
  }
});


// ── LATEST AFRICAN RELEASES (last 30 days) ─────────────────
router.get("/african/latest", async (req, res) => {
  try {
    const { country = "all", page = 1 } = req.query;
    const countryCodes = getCountryCodes(country);
    const now = new Date();
    const sixMonthsAgo = new Date(new Date().setMonth(new Date().getMonth() - 6));

    const tmdbParams = {
      language:                   "en-US",
      sort_by:                    "release_date.desc",
      "vote_count.gte":           1,
      "primary_release_date.gte": sixMonthsAgo.toISOString().split("T")[0],
      "primary_release_date.lte": now.toISOString().split("T")[0],
      include_adult:              false,
      page,
    };

    const data = await fetchAfricanMovies(tmdbParams, countryCodes);
    res.json(data);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "Failed to fetch latest" });
  }
});

// ── FEATURED AFRICAN FILM (hero) ───────────────────────────
router.get("/african/featured", async (req, res) => {
  try {
    const now = new Date();

    // Use a curated subset of the most active African film industries
    // for the featured hero — more likely to have backdrop images
    const featuredCountries = AFRICAN_COUNTRIES_ARRAY
      .filter(c => ["NG", "ZA", "EG", "CM", "GH", "KE", "MA"].includes(c))
      .join("|");

    const tmdbParams = {
      language:                   "en-US",
      sort_by:                    "vote_average.desc",
      "vote_count.gte":           3,
      "primary_release_date.gte": `${now.getFullYear() - 1}-01-01`,
      include_adult:              false,
      page:                       1,
    };

    const data = await fetchAfricanMovies(tmdbParams, featuredCountries);

    // Must have backdrop for hero display
    const withBackdrop = data.movies.filter(m => m.backdrop_path);
    res.json(withBackdrop[0] || null);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "Failed to fetch featured" });
  }
});
// ── AFRICAN MOVIE SEARCH ─────────────────────────────────  
router.get("/african/search", async (req, res) => {
  try {
    const { q, page = 1 } = req.query;
    if (!q || q.trim().length < 2) return res.json({ movies: [] });

    const response = await axios.get(
      "https://api.themoviedb.org/3/search/movie",
      {
        params: {
          query:         q.trim(),
          language:      "en-US",
          include_adult: false,
          page,
        },
        headers: {
          accept:        "application/json",
          Authorization: `Bearer ${process.env.TMDB_BEARER}`,
        },
      }
    );

    // Filter results to only African countries using AFRICAN_COUNTRIES_ARRAY
    const africanResults = response.data.results.filter(m =>
      m.origin_country?.some(c => AFRICAN_COUNTRIES_ARRAY.includes(c)) ||
      m.production_countries?.some(c => AFRICAN_COUNTRIES_ARRAY.includes(c.iso_3166_1))
    );

    res.json({
      movies:        africanResults,
      total_results: africanResults.length,
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "Search failed" });
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

    // Fallback — film not in DB yet, fetch live from TMDB
    // (handles edge cases like films from search results not yet batch-processed)
    const tmdbRes = await axios.get(
      `https://api.themoviedb.org/3/movie/${tmdbId}`,
      {
        params: { append_to_response: "videos,credits" },
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${process.env.TMDB_BEARER}`,
        },
      }
    );

    const data = tmdbRes.data;
    const trailer = data.videos?.results?.find(
      v => v.site === "YouTube" && v.type === "Trailer"
    ) || data.videos?.results?.find(v => v.site === "YouTube");

    return res.json({
      id:             data.id,
      title:          data.title,
      original_title: data.original_title,
      synopsis:       data.overview,
      release_date:   data.release_date,
      runtime:        data.runtime,
      vote_average:   data.vote_average,
      vote_count:     data.vote_count,
      genres:         data.genres?.map(g => g.name) || [],
      poster_path:    data.poster_path,
      backdrop_path:  data.backdrop_path,
      origin_country: data.production_countries?.map(c => c.iso_3166_1) || [],
      original_language: data.original_language,
      cast: data.credits?.cast?.slice(0, 10).map(c => ({
        name: c.name, character: c.character, profile_path: c.profile_path,
      })) || [],
      director:   data.credits?.crew?.find(c => c.job === "Director")?.name || null,
      trailerKey: trailer?.key || null,
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(404).json({ message: "Movie not found" });
  }
});
export default router;