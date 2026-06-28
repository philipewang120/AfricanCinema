
import "dotenv/config";
import fs from "fs";
import axios from "axios";
import db from "../db.js";

const TMDB_HEADERS = {
  accept: "application/json",
  Authorization: `Bearer ${process.env.TMDB_BEARER}`,
};

async function enrichMovie(tmdbId) {
  const res = await axios.get(
    `https://api.themoviedb.org/3/movie/${tmdbId}`,
    {
      params: { append_to_response: "videos,credits" },
      headers: TMDB_HEADERS,
    }
  );
  const data = res.data;
  const trailer = data.videos?.results?.find(
    v => v.site === "YouTube" && v.type === "Trailer"
  ) || data.videos?.results?.find(v => v.site === "YouTube");

  return {
    tmdb_id:           data.id,
    title:             data.title,
    original_title:    data.original_title,
    synopsis:          data.overview,
    release_date:      data.release_date?.trim() || null,
    release_year:      data.release_date?.trim()? parseInt(data.release_date.slice(0, 4)) : null,
    runtime:           data.runtime,
    vote_average:      data.vote_average,
    vote_count:        data.vote_count,
    poster_path:       data.poster_path,
    backdrop_path:     data.backdrop_path,
    original_language: data.original_language,
    genres:            data.genres?.map(g => g.name) || [],
    director:          data.credits?.crew?.find(c => c.job === "Director")?.name || null,
    cast_list:         data.credits?.cast?.slice(0, 10).map(c => c.name) || [],
    trailer_key:       trailer?.key || null,
  };
}

async function importAdminMovies() {
  await db.query("SELECT 1");
  console.log("✓ Database connected");

  const adminList = JSON.parse(
    fs.readFileSync("./config/adminMovies.json", "utf-8")
  );
  console.log(`Processing ${adminList.length} admin-curated films...`);

  let inserted = 0;
  let updated  = 0;
  let failed   = 0;

  for (const entry of adminList) {
    try {
      const movie = await enrichMovie(entry.tmdb_id);

      const result = await db.query(
        `INSERT INTO african_movies (
          tmdb_id, title, original_title, synopsis, release_date, release_year,
          runtime, vote_average, vote_count, poster_path, backdrop_path,
          original_language, genres, director, cast_list, trailer_key,
          tab_region, source, status, confidence_score, last_verified_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
        )
        ON CONFLICT (tmdb_id) DO UPDATE SET
          title            = EXCLUDED.title,
          synopsis         = EXCLUDED.synopsis,
          poster_path      = EXCLUDED.poster_path,
          backdrop_path    = EXCLUDED.backdrop_path,
          trailer_key      = EXCLUDED.trailer_key,
          genres           = EXCLUDED.genres,
          director         = EXCLUDED.director,
          cast_list        = EXCLUDED.cast_list,
          tab_region       = EXCLUDED.tab_region,
          source           = EXCLUDED.source,
          status           = EXCLUDED.status,
          confidence_score = EXCLUDED.confidence_score,
          last_verified_at = EXCLUDED.last_verified_at
        RETURNING id, (xmax = 0) AS inserted`,
        [
          movie.tmdb_id, movie.title, movie.original_title, movie.synopsis,
          movie.release_date, movie.release_year, movie.runtime,
          movie.vote_average, movie.vote_count, movie.poster_path,
          movie.backdrop_path, movie.original_language, movie.genres,
          movie.director, movie.cast_list, movie.trailer_key,
          entry.tab_region, "admin_json", "approved",
          5, // highest confidence — human-curated
          new Date().toISOString(),
        ]
      );

      const row = result.rows[0];
      if (row?.inserted) { inserted++; console.log(`✓ Inserted: ${movie.title}`); }
      else { updated++; console.log(`↑ Updated: ${movie.title}`); }

      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`✗ Failed tmdb_id ${entry.tmdb_id}:`, err.message);
      failed++;
    }
  }

  console.log(`\nImport complete: ${inserted} inserted, ${updated} updated, ${failed} failed`);
  process.exit(0);
}

importAdminMovies();