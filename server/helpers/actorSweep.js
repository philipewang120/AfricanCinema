
import axios from "axios";
import actorDatabase from "../config/actorDatabase.json" with { type: "json" };

const TMDB_HEADERS = {
  accept: "application/json",
  Authorization: `Bearer ${process.env.TMDB_BEARER}`,
};

async function fetchActorFilmography(actor) {
  try {
    const res = await axios.get(
      `https://api.themoviedb.org/3/person/${actor.tmdb_id}/movie_credits`,
      { headers: TMDB_HEADERS }
    );

    // Cast credits — movies the actor appeared in
    return (res.data.cast || []).map(movie => ({
      tmdb_id:          movie.id,
      title:            movie.title,
      suspected_year:   movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : null,
      suspected_country: actor.country,
      source:           "actor_sweep",
      source_confidence: 2, // slightly lower than director sweep — actor appearance
      matched_actor:    actor.name,
      poster_path:      movie.poster_path,
      vote_average:     movie.vote_average,
      release_date:     movie.release_date,
    }));

  } catch (err) {
    console.error(`Actor sweep failed for ${actor.name}:`, err.message);
    return [];
  }
}

export async function runActorSweep() {
  const allCandidates = [];

  for (const actor of actorDatabase) {
    if (!actor.tmdb_id) continue;
    const films = await fetchActorFilmography(actor);
    allCandidates.push(...films);
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`Actor sweep complete: ${actorDatabase.length} actors, ${allCandidates.length} raw film candidates`);
  return allCandidates;
}