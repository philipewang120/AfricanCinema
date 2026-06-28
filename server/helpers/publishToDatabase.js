
import db from "../db.js";

async function upsertBatch(movies) {
  if (movies.length === 0) return { inserted: 0, updated: 0 };

  // Build a single multi-row upsert instead of N individual queries
  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const movie of movies) {
    values.push(`(
      $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
      $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
      $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
      $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
      $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
      $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}
    )`);

    params.push(
      movie.tmdb_id,
      movie.title,
      movie.original_title || null,
      movie.synopsis || null,
      movie.release_date?.trim() || null,
      movie.release_date?.trim() ? movie.release_year : null,
      movie.runtime || null,
      movie.vote_average || 0,
      movie.vote_count || 0,
      movie.poster_path || null,
      movie.backdrop_path || null,
      movie.origin_country || null,
      movie.original_language || null,
      movie.genres || [],
      movie.director || null,
      movie.cast_list || [],
      movie.trailer_key || null,
      movie.confidence_score || 1,
      movie.matched_director || null,
      movie.pipeline_sources || [],
      movie.tab_region || null,
      movie.source || "pipeline",
      movie.status || "approved",
      new Date().toISOString()
    );
  }

  const query = `
    INSERT INTO african_movies (
      tmdb_id, title, original_title, synopsis, release_date, release_year,
      runtime, vote_average, vote_count, poster_path, backdrop_path,
      origin_country, original_language, genres, director, cast_list,
      trailer_key, confidence_score, matched_director, pipeline_sources,
      tab_region, source, status, last_verified_at
    ) VALUES ${values.join(", ")}
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
      source             = EXCLUDED.source,
      status             = EXCLUDED.status,
      last_verified_at   = EXCLUDED.last_verified_at
  `;

  const result = await db.query(query, params);
  return result.rowCount;
}

export async function publishToDatabase(enrichedMovies) {
  const BATCH_SIZE = 50; // 50 rows per INSERT instead of 1 per INSERT
  let totalUpserted = 0;
  let failed = 0;

  for (let i = 0; i < enrichedMovies.length; i += BATCH_SIZE) {
    const batch = enrichedMovies.slice(i, i + BATCH_SIZE);
    try {
      const count = await upsertBatch(batch);
      totalUpserted += count;
      console.log(
        `[Publish] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(enrichedMovies.length / BATCH_SIZE)} — ${count} rows upserted`
      );
    } catch (err) {
      console.error(`[Publish] Batch failed (ids ${batch[0]?.tmdb_id}–${batch[batch.length-1]?.tmdb_id}):`, err.message);
      failed += batch.length;

      // Retry batch individually only if batch fails — isolates the one bad row
      for (const movie of batch) {
        try {
          await upsertBatch([movie]);
          totalUpserted++;
        } catch (singleErr) {
          console.error(`[Publish] ✗ Failed tmdb_id ${movie.tmdb_id}:`, singleErr.message);
          failed++;
        }
      }
    }

    // Small pause between batches — lets the connection pool breathe
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nDatabase publish complete:`);
  console.log(`  Upserted: ${totalUpserted}`);
  console.log(`  Failed:   ${failed}`);
}