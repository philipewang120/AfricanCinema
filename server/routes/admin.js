import express from "express";
import db from "../db.js";
import { verifyAdmin, verifyToken , } from "../middleware/auth.js";

import { startPipelineCron } from "../cron/pipelineJob.js";

const router = express.Router();

//ADMIN ROUTES

// ── GET PENDING SUBMISSIONS (admin) ───────────────────────
router.get("/submissions", verifyAdmin, async (req, res) => {
  try {
    const { status = "pending", page = 0 } = req.query;
    const limit = 20;
    const offset = parseInt(page) * limit;

    const result = await db.query(
      `SELECT 
        s.*,
        u.username as submitter_username,
        u.profile_pic as submitter_pic,
        (SELECT COUNT(*) FROM movies WHERE user_id = s.submitted_by) as submitter_movie_count
       FROM african_submissions s
       LEFT JOIN users u ON s.submitted_by = u.id
       WHERE s.status = $1
       ORDER BY s.created_at ASC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const countResult = await db.query(
      "SELECT COUNT(*) FROM african_submissions WHERE status = $1",
      [status]
    );

    res.json({
      submissions: result.rows,
      total: parseInt(countResult.rows[0].count),
    });

  } catch (err) {
    console.error(err);
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
    // Get submission
    const subResult = await db.query(
      "SELECT * FROM african_submissions WHERE id = $1",
      [id]
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ message: "Submission not found" });
    }

    const sub = subResult.rows[0];

    // Check not already processed
    if (sub.status !== "pending") {
      return res.status(400).json({
        message: `Submission is already ${sub.status}`,
      });
    }

    // Insert into african_movies
    await db.query(
      `INSERT INTO african_movies (
        title, original_title, origin_country, original_language,
        release_date, release_year, poster_path, backdrop_path,
        synopsis, director, cast_list, genres, runtime,
        trailer_url, streaming_links, source, status, submitted_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'community','approved',$16)
      ON CONFLICT (tmdb_id) DO NOTHING`,
      [
        sub.title,
        sub.original_title,
        sub.origin_country,
        sub.original_language,
        sub.release_date,
        sub.release_year,
        sub.poster_url,
        sub.backdrop_url,
        sub.synopsis,
        sub.director,
        sub.cast_list,
        sub.genres,
        sub.runtime,
        sub.trailer_url,
        sub.streaming_links,
        sub.submitted_by,
      ]
    );

    // Update submission status
    await db.query(
      `UPDATE african_submissions
       SET status = 'approved', admin_notes = $1,
           reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3`,
      [admin_notes || null, req.user.id, id]
    );

    res.json({ success: true, message: "Submission approved and added to African movies" });

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
router.get("/african-movies", verifyAdmin, async (req, res) => {
  try {
    const { source, country, page = 0 } = req.query;
    const limit = 20;
    const offset = parseInt(page) * limit;

    let whereClause = "WHERE status = 'approved'";
    const params = [];
    let paramCount = 1;

    if (source) {
      whereClause += ` AND source = $${paramCount++}`;
      params.push(source);
    }
    if (country) {
      whereClause += ` AND origin_country = $${paramCount++}`;
      params.push(country);
    }

    params.push(limit, offset);

    const result = await db.query(
      `SELECT id, title, origin_country, release_year,
              poster_path, source, tmdb_rating, vote_count, created_at
       FROM african_movies
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM african_movies ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      movies: result.rows,
      total:  parseInt(countResult.rows[0].count),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load movies" });
  }
});

// ── EDIT AFRICAN MOVIE (admin) ────────────────────────────
router.put("/african-movies/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    title, original_title, origin_country, original_language,
    release_year, release_date, poster_path, backdrop_path,
    synopsis, director, cast_list, genres, runtime,
    trailer_url, streaming_links,
  } = req.body;

  try {
    await db.query(
      `UPDATE african_movies SET
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
        cast_list = COALESCE($11, cast_list),
        genres = COALESCE($12, genres),
        runtime = COALESCE($13, runtime),
        trailer_url = COALESCE($14, trailer_url),
        streaming_links = COALESCE($15, streaming_links)
       WHERE id = $16`,
      [
        title, original_title, origin_country, original_language,
        release_year, release_date, poster_path, backdrop_path,
        synopsis, director, cast_list, genres, runtime,
        trailer_url, streaming_links ? JSON.stringify(streaming_links) : null,
        id,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
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
      totalMovies,
      communityMovies,
      tmdbMovies,
      pendingSubmissions,
      totalSubmissions,
      totalUsers,
    ] = await Promise.all([
      db.query("SELECT COUNT(*) FROM african_movies WHERE status = 'approved'"),
      db.query("SELECT COUNT(*) FROM african_movies WHERE source = 'community' AND status = 'approved'"),
      db.query("SELECT COUNT(*) FROM african_movies WHERE source = 'tmdb'"),
      db.query("SELECT COUNT(*) FROM african_submissions WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) FROM african_submissions"),
      db.query("SELECT COUNT(*) FROM users"),
    ]);

    res.json({
      totalMovies:       parseInt(totalMovies.rows[0].count),
      communityMovies:   parseInt(communityMovies.rows[0].count),
      tmdbMovies:        parseInt(tmdbMovies.rows[0].count),
      pendingSubmissions:parseInt(pendingSubmissions.rows[0].count),
      totalSubmissions:  parseInt(totalSubmissions.rows[0].count),
      totalUsers:        parseInt(totalUsers.rows[0].count),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load stats" });
  }
});
// ── MANUAL PIPELINE TRIGGER (admin) ───────────────────────
router.post("/admin/run-pipeline", verifyToken, async (req, res) => {
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