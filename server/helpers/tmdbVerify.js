
import axios from "axios";

const TMDB_HEADERS = {
  accept: "application/json",
  Authorization: `Bearer ${process.env.TMDB_BEARER}`,
};

// Strip Wikipedia-style disambiguation suffixes before searching TMDB,
// e.g. "Reel Love (2025 film)" -> "Reel Love", "Half of a Yellow Sun (film)" -> "Half of a Yellow Sun"
function cleanTitleForSearch(title) {
  return title
    .replace(/\s*\(\d{4}\s*film\)\s*$/i, "")
    .replace(/\s*\(film\)\s*$/i, "")
    .trim();
}

// For candidates that already have a tmdb_id (director_sweep results) —
// just confirm the movie still exists and pull fresh metadata
async function verifyById(tmdbId) {
  try {
    const res = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}`, {
      headers: TMDB_HEADERS,
    });
    return res.data;
  } catch (err) {
    return null; // movie was removed/doesn't exist anymore — rare but possible
  }
}

// For candidates with no tmdb_id (Wikipedia-only) — search by title + year
async function searchByTitle(title, year) {
  const cleanedTitle = cleanTitleForSearch(title);

  try {
    const res = await axios.get("https://api.themoviedb.org/3/search/movie", {
      params: { query: cleanedTitle, year: year || undefined, include_adult: false },
      headers: TMDB_HEADERS,
    });

    const results = res.data.results || [];
    if (results.length === 0) return null;

    // If we have a year, prefer the closest match; otherwise take TMDB's top result
    if (year) {
      const closeMatch = results.find(r => {
        const rYear = r.release_date ? parseInt(r.release_date.slice(0, 4)) : null;
        return rYear && Math.abs(rYear - year) <= 1;
      });
      if (closeMatch) return closeMatch;
    }

    return results[0];
  } catch (err) {
    return null;
  }
}

function buildEnrichedCandidate(candidate, tmdbData) {
  return {
    ...candidate,
    tmdb_id:        tmdbData.id,
    title:          tmdbData.title,
    poster_path:    tmdbData.poster_path,
    backdrop_path:  tmdbData.backdrop_path,
    release_date:   tmdbData.release_date,
    vote_average:   tmdbData.vote_average,
    vote_count:     tmdbData.vote_count,
    origin_country: tmdbData.origin_country || tmdbData.production_countries?.map(c => c.iso_3166_1) || [],
    original_language: tmdbData.original_language,
    verified: true,
  };
}

export async function verifyAllCandidates(mergedCandidates) {
  const verified = [];
  const rejected = [];

  for (const candidate of mergedCandidates) {
    let tmdbData = null;

    if (candidate.tmdb_id) {
      // Already has an ID from director sweep — confirm it's still valid
      tmdbData = await verifyById(candidate.tmdb_id);
    } else {
      // No ID yet (Wikipedia-only) — search for it
      tmdbData = await searchByTitle(candidate.title, candidate.suspected_year);
    }

    if (tmdbData) {
      verified.push(buildEnrichedCandidate(candidate, tmdbData));
    } else {
      rejected.push(candidate); // couldn't verify — gets dropped or flagged for review
    }

    await new Promise(r => setTimeout(r, 150)); // gentle rate limiting
  }

  console.log(
    `\nTMDB verification: ${verified.length} confirmed, ${rejected.length} could not be verified`
  );

  return { verified, rejected };
}