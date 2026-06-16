import axios from "axios";
import { ALL_AFRICA, AFRICAN_COUNTRIES_ARRAY } from "../config/africanCountries.js";


export async function fetchAfricanMovies(tmdbParams, countryCodes) {
  const headers = {
    accept: "application/json",
    Authorization: `Bearer ${process.env.TMDB_BEARER}`,
  };

  const [r1, r2] = await Promise.all([
    axios.get("https://api.themoviedb.org/3/discover/movie", {
      params: { ...tmdbParams, with_origin_country: countryCodes },
      headers,
    }),
    axios.get("https://api.themoviedb.org/3/discover/movie", {
      params: { ...tmdbParams, with_production_country: countryCodes },
      headers,
    }),
  ]);

  // Merge and deduplicate by id
  const merged = [...r1.data.results, ...r2.data.results]
    .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i);

  // Sort based on query intent
  if (tmdbParams.sort_by === "vote_average.desc") {
    merged.sort((a, b) => b.vote_average - a.vote_average);
  } else {
    merged.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
  }

  return {
    movies:        merged,
    total_results: merged.length,
    total_pages:   Math.max(r1.data.total_pages, r2.data.total_pages),
  };
}


export async function fetchNollywoodMovies(tmdbParams) {
  const headers = {
    accept: "application/json",
    Authorization: `Bearer ${process.env.TMDB_BEARER}`,
  };

  // Fetch by origin country only for Nigeria — more accurate
  const response = await axios.get(
    "https://api.themoviedb.org/3/discover/movie",
    {
      params: {
        ...tmdbParams,
        with_origin_country: "NG",
      },
      headers,
    }
  );

  // Filter out movies that are clearly not Nigerian
  // A movie is "clearly not Nigerian" if:
  // - It has no NG in origin_country
  // - AND its primary origin is a major Western country
  const NON_AFRICAN = ["US", "GB", "FR", "DE", "IT", "ES", "AU", "CA", "JP", "KR", "CN"];

  const filtered = response.data.results.filter(m => {
    const origins = m.origin_country || [];

    // Keep if NG is in origin countries
    if (origins.includes("NG")) return true;

    // Drop if exclusively from non-African countries
    if (origins.every(c => NON_AFRICAN.includes(c))) return false;

    return true;
  });

  return {
    movies:        filtered,
    total_results: filtered.length,
    total_pages:   response.data.total_pages,
  };
}

export async function fetchCameroonMovies(tmdbParams) {
  const headers = {
    accept: "application/json",
    Authorization: `Bearer ${process.env.TMDB_BEARER}`,
  };

  const NON_AFRICAN = ["US", "GB", "FR", "DE", "IT", "ES", "AU", "CA", "JP", "KR", "CN"];

  const response = await axios.get(
    "https://api.themoviedb.org/3/discover/movie",
    {
      params: { ...tmdbParams, with_origin_country: "CM" },
      headers,
    }
  );

  const filtered = response.data.results.filter(m => {
    const origins = m.origin_country || [];
    if (origins.includes("CM")) return true;
    if (origins.every(c => NON_AFRICAN.includes(c))) return false;
    return true;
  });

  return {
    movies:        filtered,
    total_results: filtered.length,
    total_pages:   response.data.total_pages,
  };
}
//helper fxn to get country codes for african cinema routes
export function getCountryCodes(country) {
  const TAB_MAP = {
    all: ALL_AFRICA,
    NG:  "NG",
    CM:  "CM",
    ZA:  "ZA",
    GH:  "GH",
    EG:  "EG",
  };
  return TAB_MAP[country] || ALL_AFRICA;
}