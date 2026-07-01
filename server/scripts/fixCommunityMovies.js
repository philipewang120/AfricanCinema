
import "dotenv/config";
import db from "../db.js";
import axios from "axios";

async function fixCommunityMovies() {
    await db.query("SELECT 1");
    console.log("✓ DB connected");

    // Find community films that have no tmdb_id and broken/missing poster
    const result = await db.query(
        `SELECT am.id, am.title, am.release_year, as2.poster_url, as2.backdrop_url
     FROM african_movies am
     LEFT JOIN african_submissions as2 ON as2.title = am.title
     WHERE am.source IN ('community', 'community_submission_unverified')
       AND am.tmdb_id IS NULL
     LIMIT 100`
    );

    console.log(`Found ${result.rows.length} community films to fix`);

    for (const film of result.rows) {
        // Update poster_path with the submission's poster_url if available
        if (film.poster_url) {
            await db.query(
                `UPDATE african_movies
         SET poster_path = $1, backdrop_path = $2,
             is_community_unverified = true
         WHERE id = $3`,
                [film.poster_url, film.backdrop_url || null, film.id]
            );
            console.log(`✓ Fixed: ${film.title}`);
        }
    }

    console.log("Done");
    process.exit(0);
}

fixCommunityMovies();