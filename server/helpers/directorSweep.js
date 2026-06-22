import axios from "axios";
import directorDatabase from "../config/directorDatabase.json" with { type: "json" };

const TMDB_HEADERS = {
  accept: "application/json",
  Authorization: `Bearer ${process.env.TMDB_BEARER}`,
};

// Pull one director's filmography from TMDB
async function fetchDirectorFilmography(director) {
  try {
    const res = await axios.get(
      `https://api.themoviedb.org/3/person/${director.tmdb_id}/movie_credits`,
      { headers: TMDB_HEADERS }
    );

    // Only keep credits where this person's job was literally "Director"
    const directedFilms = (res.data.crew || []).filter(c => c.job === "Director");

    return directedFilms.map(movie => ({
      tmdb_id: movie.id,
      title: movie.title,
      suspected_year: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : null,
      suspected_country: director.country,
      source: "director_sweep",
      source_confidence: 3,
      matched_director: director.name,
      poster_path: movie.poster_path,
      vote_average: movie.vote_average,
      release_date: movie.release_date,
    }));

  } catch (err) {
    console.error(`Director sweep failed for ${director.name} (${director.tmdb_id}):`, err.message);
    return [];
  }
}

// Sweep all directors, with gentle rate limiting to stay within TMDB's limits
export async function runDirectorSweep() {
  const allCandidates = [];
  const startTime = Date.now();

  for (const director of directorDatabase) {
    const films = await fetchDirectorFilmography(director);
    allCandidates.push(...films);

    // Small delay between requests — TMDB allows ~50 req/sec, but no need to
    // hammer it for a bi-weekly batch job that isn't time-sensitive
    await new Promise(r => setTimeout(r, 150));
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `Director sweep complete: ${directorDatabase.length} directors, ` +
    `${allCandidates.length} raw film candidates, ${elapsedSec}s elapsed`
  );

  return allCandidates;
}