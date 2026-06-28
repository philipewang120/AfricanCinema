
import axios from "axios";

const TMDB_HEADERS = {
  accept: "application/json",
  Authorization: `Bearer ${process.env.TMDB_BEARER}`,
};

// ISO 639-1 codes for African languages
// TMDB uses these in original_language field
const AFRICAN_LANGUAGES = [
  { code: "ff",  name: "Fulah/Fula",    region: "FR"   },
  { code: "ha",  name: "Hausa",         region: "NG"   },
  { code: "yo",  name: "Yoruba",        region: "NG"   },
  { code: "ig",  name: "Igbo",          region: "NG"   },
  { code: "af",  name: "Afrikaans",     region: "ZA"   },
  { code: "tn",  name: "Tswana",        region: "ZA"   },
  { code: "st",  name: "Sotho",         region: "ZA"   },
  { code: "mg",  name: "Malagasy",      region: "OTHER" },
  { code: "am",  name: "Amharic",       region: "OTHER" },
  { code: "sw",  name: "Swahili",       region: "OTHER" },
  { code: "zu",  name: "Zulu",          region: "ZA"   },
  { code: "xh",  name: "Xhosa",         region: "ZA"   },
  { code: "tw",  name: "Twi",           region: "GH"   },
  { code: "wo",  name: "Wolof",         region: "FR"   },
  { code: "om",  name: "Oromo",         region: "OTHER" },
  { code: "so",  name: "Somali",        region: "OTHER" },
];

async function fetchByLanguage(lang, page = 1) {
  try {
    const res = await axios.get(
      "https://api.themoviedb.org/3/discover/movie",
      {
        params: {
          with_original_language: lang.code,
          sort_by:                "popularity.desc",
          "vote_count.gte":       0,
          include_adult:          false,
          page,
        },
        headers: TMDB_HEADERS,
      }
    );
    return res.data;
  } catch (err) {
    console.error(`Language sweep failed for ${lang.name}:`, err.message);
    return { results: [], total_pages: 0 };
  }
}

export async function runLanguageSweep(maxPagesPerLanguage = 3) {
  const allCandidates = [];

  for (const lang of AFRICAN_LANGUAGES) {
    console.log(`Sweeping language: ${lang.name} (${lang.code})`);
    let totalFound = 0;

    for (let page = 1; page <= maxPagesPerLanguage; page++) {
      const data = await fetchByLanguage(lang, page);
      if (!data.results?.length) break;

      data.results.forEach(movie => {
        allCandidates.push({
          tmdb_id:           movie.id,
          title:             movie.title,
          suspected_year:    movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : null,
          suspected_country: lang.region,
          source:            "language_sweep",
          source_confidence: 2,
          matched_language:  lang.name,
          poster_path:       movie.poster_path,
          vote_average:      movie.vote_average,
          release_date:      movie.release_date,
        });
      });

      totalFound += data.results.length;
      if (page >= data.total_pages) break;
      await new Promise(r => setTimeout(r, 150));
    }

    console.log(`  ${lang.name}: ${totalFound} candidates found`);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nLanguage sweep complete: ${allCandidates.length} raw candidates`);
  return allCandidates;
}