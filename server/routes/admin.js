import express from "express";
import db from "../db.js";
import { verifyAdmin, verifyToken, } from "../middleware/auth.js";
import { enrichSubmissionViaTMDB } from "../helpers/enrichSubmissionViaTMDB.js";
import { normalizePosterPath, isFullUrl } from "../helpers/imageHelpers.js";

import { startPipelineCron } from "../cron/pipelineJob.js";

const router = express.Router();

//ADMIN ROUTES

// ── GET PENDING SUBMISSIONS (admin) ───────────────────────
router.get("/submissions", verifyAdmin, async (req, res) => {
  try {
    const status = req.query.status || "pending";
    const page = Math.max(parseInt(req.query.page || "0") || 0, 0);

    const limit = 20;
    const offset = page * limit;

    // -----------------------------
    // MAIN QUERY
    // -----------------------------
    const result = await db.query(
      `
      SELECT 
        s.*,
        u.username AS submitter_username,
        u.profile_pic AS submitter_pic,

        -- FIXED: use african_movies instead of movies
        (
          SELECT COUNT(*) 
          FROM african_movies m 
          WHERE m.submitted_by = s.submitted_by
        ) AS submitter_movie_count

      FROM african_submissions s
      LEFT JOIN users u ON s.submitted_by = u.id
      WHERE s.status = $1
      ORDER BY s.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [status, limit, offset]
    );

    // -----------------------------
    // COUNT QUERY (optimized + consistent)
    // -----------------------------
    const countResult = await db.query(
      `
      SELECT COUNT(*) 
      FROM african_submissions 
      WHERE status = $1
      `,
      [status]
    );

    res.json({
      submissions: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page,
      hasMore: offset + limit < parseInt(countResult.rows[0].count, 10)
    });

  } catch (err) {
    console.error("❌ submissions route error:", err);
    res.status(500).json({ message: "Failed to load submissions" });
  }
});

// ── GET SUBMISSION COUNTS BY STATUS (admin) ────────────────
router.get("/submissions/counts", verifyAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT status, COUNT(*) as count
       FROM african_submissions
       GROUP BY status`
    );

    const counts = { pending: 0, approved: 0, rejected: 0 };
    result.rows.forEach(r => { counts[r.status] = parseInt(r.count); });

    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load counts" });
  }
});

// ── APPROVE SUBMISSION (admin) ─────────────────────────────
router.put("/submissions/:id/approve", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { admin_notes } = req.body;

  try {
    const subResult = await db.query(
      "SELECT * FROM african_submissions WHERE id = $1",
      [id]
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ message: "Submission not found" });
    }

    const sub = subResult.rows[0];

    if (sub.status !== "pending") {
      return res.status(400).json({
        message: `Submission is already ${sub.status}`,
      });
    }

    // Try to enrich via TMDB first
    const enriched = await enrichSubmissionViaTMDB(sub);

    if (enriched) {
      // Found on TMDB — insert with full enrichment, proper tab_region,
      // confidence_score reflecting "human-submitted + TMDB-verified"
      await db.query(
        `INSERT INTO african_movies (
          tmdb_id, title, original_title, synopsis, release_date, release_year,
          runtime, vote_average, vote_count, poster_path, backdrop_path,
          origin_country, original_language, genres, director, cast_list,
          trailer_key, tab_region, source, status, confidence_score,
          submitted_by, last_verified_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
          $12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
          $22,$23
        )
        ON CONFLICT (tmdb_id) DO UPDATE SET
          status            = 'approved',
          source            = 'community_submission',
          confidence_score  = GREATEST(african_movies.confidence_score, EXCLUDED.confidence_score),
          submitted_by      = EXCLUDED.submitted_by`,
        [
          enriched.tmdb_id,
          enriched.title,
          enriched.original_title,
          enriched.synopsis,
          enriched.release_date,
          enriched.release_year,
          enriched.runtime,
          enriched.vote_average,
          enriched.vote_count,
          enriched.poster_path,
          enriched.backdrop_path,
          sub.origin_country,
          enriched.original_language,
          enriched.genres,
          enriched.director,
          enriched.cast_list,
          enriched.trailer_key,
          sub.origin_country, // tab_region mirrors origin_country for community subs
          "community_submission",
          "approved",
          4, // confidence: human-submitted (3) + TMDB-verified bonus
          sub.submitted_by,
          new Date().toISOString(),
        ]
      );
    } else {
      // Not found on TMDB — insert raw submission data as a fallback,
      // still tagged properly for tab filtering, but lower confidence
      // since it's unverified against TMDB
      const castList = Array.isArray(sub.cast_list) ? sub.cast_list : [];
      const genres = Array.isArray(sub.genres) ? sub.genres : [];

      // In the fallback branch of the approve route — update these fields:
      await db.query(
        `INSERT INTO african_movies (
    title, original_title, origin_country, original_language,
    release_date, release_year, poster_path, backdrop_path,
    synopsis, director, cast_list, genres, runtime, trailer_key,
    tab_region, source, status, confidence_score, submitted_by,
    last_verified_at, is_community_unverified
  ) VALUES (
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
    $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
  )`,
        [
          sub.title,
          sub.original_title,
          sub.origin_country,
          sub.original_language,
          sub.release_date?.trim() || null,
          sub.release_date?.trim() ? parseInt(sub.release_date.slice(0, 4)) : sub.release_year,
          normalizePosterPath(sub.poster_url),   // ← store full URL here
          normalizePosterPath(sub.backdrop_url), // ← store full URL here
          sub.synopsis,
          sub.director,
          Array.isArray(sub.cast_list) ? sub.cast_list : [],
          Array.isArray(sub.genres) ? sub.genres : [],
          sub.runtime,
          sub.trailer_url || null,
          sub.origin_country,
          "community_submission_unverified",
          "approved",
          2,
          sub.submitted_by,
          new Date().toISOString(),
          true, // flag — no TMDB id, raw community data
        ]
      );
    }

    await db.query(
      `UPDATE african_submissions
       SET status = 'approved',
           admin_notes = $1,
           reviewed_by = $2,
           reviewed_at = NOW()
       WHERE id = $3`,
      [admin_notes || null, req.user.id, id]
    );

    res.json({
      success: true,
      message: enriched
        ? "Submission approved and enriched via TMDB"
        : "Submission approved (TMDB match not found — using submitted data)",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to approve submission" });
  }
});

// ── REJECT SUBMISSION (admin) ──────────────────────────────
router.put("/submissions/:id/reject", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { admin_notes } = req.body;

  try {
    const result = await db.query(
      "SELECT status FROM african_submissions WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Submission not found" });
    }

    if (result.rows[0].status !== "pending") {
      return res.status(400).json({
        message: `Submission is already ${result.rows[0].status}`,
      });
    }

    await db.query(
      `UPDATE african_submissions
       SET status = 'rejected', admin_notes = $1,
           reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3`,
      [admin_notes || null, req.user.id, id]
    );

    res.json({ success: true, message: "Submission rejected" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reject submission" });
  }
});

// ── GET ALL AFRICAN MOVIES (admin) ────────────────────────
router.get("/african-movies", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { page = 0, status = "approved" } = req.query;
    const limit = 20;
    const offset = parseInt(page) * limit;

    const countResult = await db.query(
      `SELECT COUNT(*) FROM african_movies WHERE status = $1`,
      [status]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT id, tmdb_id, title, poster_path, origin_country, tab_region,
              release_year, vote_average, source
       FROM african_movies
       WHERE status = $1
       ORDER BY last_verified_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    res.json({ movies: result.rows, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch movies" });
  }
});

// ── EDIT AFRICAN MOVIE (admin) ────────────────────────────
router.put("/african-movies/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;

  const {
    title,
    original_title,
    origin_country,
    original_language,
    release_year,
    release_date,
    poster_path,
    backdrop_path,
    synopsis,
    director,
    cast_list,
    genres,
    runtime,
    trailer_url,
    streaming_links,
  } = req.body;

  try {
    // --------------------------
    // NORMALIZE INPUTS (IMPORTANT)
    // --------------------------
    const safeCastList = Array.isArray(cast_list)
      ? cast_list
      : cast_list
        ? JSON.parse(cast_list)
        : null;

    const safeGenres = Array.isArray(genres)
      ? genres
      : genres
        ? JSON.parse(genres)
        : null;

    const safeStreamingLinks =
      typeof streaming_links === "object"
        ? streaming_links
        : streaming_links
          ? JSON.parse(streaming_links)
          : null;

    await db.query(
      `
      UPDATE african_movies SET
        title = COALESCE($1, title),
        original_title = COALESCE($2, original_title),
        origin_country = COALESCE($3, origin_country),
        original_language = COALESCE($4, original_language),
        release_year = COALESCE($5, release_year),
        release_date = COALESCE($6, release_date),
        poster_path = COALESCE($7, poster_path),
        backdrop_path = COALESCE($8, backdrop_path),
        synopsis = COALESCE($9, synopsis),
        director = COALESCE($10, director),

        cast_list = COALESCE($11, cast_list::text[]),
        genres = COALESCE($12, genres::text[]),

        runtime = COALESCE($13, runtime),
        trailer_url = COALESCE($14, trailer_url),

        streaming_links = COALESCE($15, streaming_links::jsonb)

      WHERE id = $16
      `,
      [
        title,
        original_title,
        origin_country,
        original_language,
        release_year,
        release_date,
        poster_path,
        backdrop_path,
        synopsis,
        director,
        safeCastList,
        safeGenres,
        runtime,
        trailer_url,
        safeStreamingLinks,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Movie updated successfully",
    });

  } catch (err) {
    console.error("❌ update movie error:", err);
    res.status(500).json({ message: "Failed to update movie" });
  }
});

// ── DELETE AFRICAN MOVIE (admin) ──────────────────────────
router.delete("/african-movies/:id", verifyAdmin, async (req, res) => {
  try {
    await db.query(
      "DELETE FROM african_movies WHERE id = $1",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete movie" });
  }
});

// ── DELETE SUBMISSION (admin) ─────────────────────────────
router.delete("/submissions/:id", verifyAdmin, async (req, res) => {
  try {
    await db.query(
      "DELETE FROM african_submissions WHERE id = $1",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete submission" });
  }
});

// ── ADMIN STATS OVERVIEW ──────────────────────────────────
router.get("/stats", verifyAdmin, async (req, res) => {
  try {
    const [
      moviesTotal,
      moviesApproved,
      moviesPending,
      moviesRejected,
      communityMovies,
      pipelineMovies,
      adminMovies,
      usersTotal,
      submissionsTotal,
    ] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM african_movies`),
      db.query(`SELECT COUNT(*) FROM african_movies WHERE status = 'approved'`),
      db.query(`SELECT COUNT(*) FROM african_movies WHERE status = 'pending'`),
      db.query(`SELECT COUNT(*) FROM african_movies WHERE status = 'rejected'`),
      db.query(`SELECT COUNT(*) FROM african_movies WHERE source LIKE 'community%'`),
      db.query(`SELECT COUNT(*) FROM african_movies WHERE source IN ('director_sweep', 'actor_sweep', 'language_sweep', 'wikipedia', 'tmdb_search')`),
      db.query(`SELECT COUNT(*) FROM african_movies WHERE source = 'admin_json'`),
      db.query(`SELECT COUNT(*) FROM users`),
      db.query(`SELECT COUNT(*) FROM african_submissions`),
    ]);

    res.json({
      totalMovies: parseInt(moviesTotal.rows[0].count),
      approvedMovies: parseInt(moviesApproved.rows[0].count),
      pendingMovies: parseInt(moviesPending.rows[0].count),
      rejectedMovies: parseInt(moviesRejected.rows[0].count),
      communityMovies: parseInt(communityMovies.rows[0].count),
      pipelineMovies: parseInt(pipelineMovies.rows[0].count),
      adminCuratedMovies: parseInt(adminMovies.rows[0].count),
      totalUsers: parseInt(usersTotal.rows[0].count),
      totalSubmissions: parseInt(submissionsTotal.rows[0].count),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load stats" });
  }
});

// ── GET PENDING MOVIES (pipeline-sourced, awaiting approval) ──────────────
router.get("/pending-movies", verifyAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "0") || 0, 0);
    const limit = 20;
    const offset = page * limit;

    const result = await db.query(
      `SELECT
        id, tmdb_id, title, release_date, release_year,
        poster_path, vote_average, vote_count, genres,
        director, tab_region, confidence_score, source,
        matched_director, pipeline_sources, last_verified_at
       FROM african_movies
       WHERE status = 'pending'
       ORDER BY confidence_score DESC, last_verified_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM african_movies WHERE status = 'pending'`
    );

    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      movies: result.rows,
      total,
      page,
      hasMore: offset + limit < total,
    });

  } catch (err) {
    console.error("❌ pending-movies route error:", err);
    res.status(500).json({ message: "Failed to load pending movies" });
  }
});

// ── GET PENDING MOVIES COUNT (for tab badge) ───────────────────────────────
router.get("/pending-movies/count", verifyAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*) FROM african_movies WHERE status = 'pending'`
    );
    res.json({ pending: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load pending count" });
  }
});

// ── APPROVE PENDING MOVIE ──────────────────────────────────────────────────
router.put("/pending-movies/:id/approve", verifyAdmin,  async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      "SELECT status FROM african_movies WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Movie not found" });
    }

    if (result.rows[0].status !== "pending") {
      return res.status(400).json({
        message: `Movie is already ${result.rows[0].status}`,
      });
    }

    await db.query(
      `UPDATE african_movies
       SET status = 'approved'
       WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: "Movie approved" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to approve movie" });
  }
});

// ── REJECT PENDING MOVIE ───────────────────────────────────────────────────
router.put("/pending-movies/:id/reject", verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      "SELECT status FROM african_movies WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Movie not found" });
    }

    if (result.rows[0].status !== "pending") {
      return res.status(400).json({
        message: `Movie is already ${result.rows[0].status}`,
      });
    }

    await db.query(
      `UPDATE african_movies
       SET status = 'rejected'
       WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: "Movie rejected" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reject movie" });
  }
});

// ── MANUAL PIPELINE TRIGGER (admin) ───────────────────────
router.post("/run-pipeline", verifyToken, async (req, res) => {
  // Check admin role
  const payload = JSON.parse(atob(req.headers.authorization.split(" ")[1].split(".")[1]));
  if (payload.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  // Don't await — let it run in background, respond immediately
  res.json({ message: "Pipeline triggered — check server logs for progress" });
  runPipeline();
});

export default router;