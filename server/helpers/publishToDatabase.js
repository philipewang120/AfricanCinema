
import db from "../db.js";

async function upsertWithRetry(movie, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await db.query(
        `INSERT INTO african_movies (
          tmdb_id, title, original_title, synopsis, release_date, release_year,
          runtime, vote_average, vote_count, poster_path, backdrop_path,
          origin_country, original_language, genres, director, cast_list,
          trailer_key, confidence_score, matched_director, pipeline_sources,
          tab_region, source, status, last_verified_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
          $12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24
        )
        ON CONFLICT (tmdb_id) DO UPDATE SET
          title              = EXCLUDED.title,
          synopsis           = EXCLUDED.synopsis,
          release_date       = EXCLUDED.release_date,
          release_year       = EXCLUDED.release_year,
          runtime            = EXCLUDED.runtime,
          vote_average       = EXCLUDED.vote_average,
          vote_count         = EXCLUDED.vote_count,
          poster_path        = EXCLUDED.poster_path,
          backdrop_path      = EXCLUDED.backdrop_path,
          genres             = EXCLUDED.genres,
          director           = EXCLUDED.director,
          cast_list          = EXCLUDED.cast_list,
          trailer_key        = EXCLUDED.trailer_key,
          confidence_score   = EXCLUDED.confidence_score,
          pipeline_sources   = EXCLUDED.pipeline_sources,
          tab_region         = EXCLUDED.tab_region,
          status             = EXCLUDED.status,
          last_verified_at   = EXCLUDED.last_verified_at
        RETURNING id, (xmax = 0) AS inserted`,
        [
          movie.tmdb_id, movie.title, movie.original_title, movie.synopsis,
          movie.release_date, movie.release_year, movie.runtime,
          movie.vote_average, movie.vote_count, movie.poster_path,
          movie.backdrop_path, movie.origin_country, movie.original_language,
          movie.genres, movie.director, movie.cast_list, movie.trailer_key,
          movie.confidence_score, movie.matched_director, movie.pipeline_sources,
          movie.tab_region, movie.source, movie.status, movie.last_verified_at,
        ]
      );
      return result.rows[0];
    } catch (err) {
      const isConnectionError = ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "57P01"].some(
        code => err.message?.includes(code) || err.code === code
      );

      if (isConnectionError && attempt < retries) {
        console.warn(`Connection error on attempt ${attempt} for tmdb_id ${movie.tmdb_id} — retrying in 2s...`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      throw err; // non-connection error or out of retries — bubble up
    }
  }
}

export async function publishToDatabase(enrichedMovies) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const movie of enrichedMovies) {
    try {
      const row = await upsertWithRetry(movie);
      if (row?.inserted) {
        inserted++;
      } else {
        updated++;
      }
    } catch (err) {
      console.error(`Failed to upsert tmdb_id ${movie.tmdb_id} after retries:`, err.message);
      skipped++;
    }
  }

  console.log(`\nDatabase publish complete:`);
  console.log(`  Inserted (new): ${inserted}`);
  console.log(`  Updated (existing): ${updated}`);
  console.log(`  Failed/skipped: ${skipped}`);
}