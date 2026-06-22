
import axios from "axios";

const TMDB_HEADERS = {
  accept: "application/json",
  Authorization: `Bearer ${process.env.TMDB_BEARER}`,
};

async function fetchFullMovieData(tmdbId) {
  try {
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
    ) || data.videos?.results?.find(v => v.site === "YouTube") || null;

    const director = data.credits?.crew?.find(c => c.job === "Director")?.name || null;

    const cast = data.credits?.cast
      ?.slice(0, 10)
      .map(c => c.name) || [];

    return {
      tmdb_id:           data.id,
      title:             data.title,
      original_title:    data.original_title,
      synopsis:          data.overview || null,
      release_date:      data.release_date || null,
      release_year:      data.release_date ? parseInt(data.release_date.slice(0, 4)) : null,
      runtime:           data.runtime || null,
      vote_average:      data.vote_average || 0,
      vote_count:        data.vote_count || 0,
      poster_path:       data.poster_path || null,
      backdrop_path:     data.backdrop_path || null,
      origin_country:    data.production_countries?.[0]?.iso_3166_1 || null,
      original_language: data.original_language || null,
      genres:            data.genres?.map(g => g.name) || [],
      director:          director,
      cast_list:         cast,
      trailer_key:       trailer?.key || null,
    };

  } catch (err) {
    console.error(`Enrichment failed for tmdb_id ${tmdbId}:`, err.message);
    return null;
  }
}

export async function enrichAllCandidates(verifiedCandidates) {
  const enriched = [];
  const failed = [];

  for (const candidate of verifiedCandidates) {
    const fullData = await fetchFullMovieData(candidate.tmdb_id);

    if (fullData) {
      enriched.push({
        ...fullData,
        suspected_country: candidate.suspected_country,
        confidence_score:  candidate.confidence_score,
        matched_director:  candidate.matched_director || candidate.raw_candidates?.find(r => r.matched_director)?.matched_director || null,
        pipeline_sources:  candidate.sources,
        tab_region:        candidate.suspected_country,
        source:            candidate.sources?.includes("director_sweep") ? "ai_curated" : "wikipedia",
        status:            candidate.confidence_score >= 5 ? "approved" : "pending",
        last_verified_at:  new Date().toISOString(),
      });
    } else {
      failed.push(candidate.tmdb_id);
    }

    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`Enrichment complete: ${enriched.length} enriched, ${failed.length} failed`);
  return { enriched, failed };
}