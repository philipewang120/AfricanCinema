// server/helpers/wikipediaSweep.js
import axios from "axios";

const WIKI_API = "https://en.wikipedia.org/w/api.php";

const WIKI_PAGES = [
  { title: "2026 Africa Magic Viewers' Choice Awards", country: "NG", confidence: 3, strategy: "table" },
  { title: "List of highest-grossing Nigerian films",   country: "NG", confidence: 2, strategy: "table" },
  { title: "List of Cameroonian films",                 country: "CM", confidence: 2, strategy: "table" },
  { title: "Cameroon International Film Festival",       country: "CM", confidence: 2, strategy: "italic" },
  { title: "List of South African films",                country: "ZA", confidence: 2, strategy: "table" },
  { title: "Écrans Noirs Festival",                       country: "CM", confidence: 2, strategy: "italic" },
];

async function fetchWikiPage(title) {
  try {
    const res = await axios.get(WIKI_API, {
      params: {
        action: "parse",
        page: title,
        prop: "wikitext",
        format: "json",
        formatversion: 2,
      },
      headers: { "User-Agent": "AfricanCinemaApp/1.0 (contact: your-email@example.com)" },
    });
    return res.data?.parse?.wikitext ?? null;
  } catch (err) {
    console.error(`Failed to fetch "${title}":`, err.message);
    return null;
  }
}

// Extract just the wikitext between two section headers — used for the
// South African films page where we only want the "2020s" section
function extractSection(wikitext, sectionHeading) {
  if (!wikitext) return null;

  const headingPattern = new RegExp(`==\\s*${sectionHeading}\\s*==`, "i");
  const startMatch = wikitext.match(headingPattern);
  if (!startMatch) return null;

  const startIndex = startMatch.index + startMatch[0].length;
  const rest = wikitext.slice(startIndex);
  const nextHeadingMatch = rest.match(/\n==[^=]/);
  const endIndex = nextHeadingMatch ? nextHeadingMatch.index : rest.length;

  return rest.slice(0, endIndex);
}

function isLikelyFilmTitle(candidate) {
  if (!candidate || candidate.length < 2 || candidate.length > 100) return false;

  const EXCLUDE_PREFIXES = ["Category:", "File:", "Template:", "Wikipedia:", "List of"];
  if (EXCLUDE_PREFIXES.some(p => candidate.startsWith(p))) return false;

  if (/^\d{4}$/.test(candidate)) return false; // bare years

  const NEWS_OUTLET_PATTERN = /\b(News|BBC|Guardian|Punch|Vanguard|Premium Times|DStv|GOtv)\b/i;
  if (NEWS_OUTLET_PATTERN.test(candidate)) return false;

  return true;
}

// Table-based extraction — takes the FIRST wikilink per table row,
// since film title is almost always the leftmost column
function extractTitlesFromTable(wikitext) {
  const titles = [];
  const tableBlocks = wikitext.match(/\{\|[\s\S]*?\n\|\}/g) || [];

  for (const table of tableBlocks) {
    const rows = table.split(/\n\|-/);

    for (const row of rows) {
      const firstLinkMatch = row.match(/\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]/);
      if (firstLinkMatch) {
        const candidate = firstLinkMatch[1].trim();
        if (isLikelyFilmTitle(candidate)) {
          titles.push(candidate);
        }
      }
    }
  }

  return [...new Set(titles)];
}

// Prose-based extraction — italicized text is Wikipedia's convention
// for titles of creative works (films, books, etc.)
function extractItalicizedTitles(wikitext) {
  const titles = [];
  const italicPattern = /''([^']{2,80})''/g;
  let match;

  while ((match = italicPattern.exec(wikitext)) !== null) {
    const candidate = match[1].trim();
    if (isLikelyFilmTitle(candidate)) {
      titles.push(candidate);
    }
  }

  return [...new Set(titles)];
}

export async function runWikipediaSweep() {
  const allCandidates = [];

  for (const page of WIKI_PAGES) {
    const wikitext = await fetchWikiPage(page.title);

    if (!wikitext) {
      console.log(`Could not fetch: "${page.title}" — skipping`);
      continue;
    }

    let textToScan = wikitext;
    if (page.title === "List of South African films") {
      const section2020s = extractSection(wikitext, "2020s");
      if (section2020s) {
        textToScan = section2020s;
      } else {
        console.log(`Could not find "2020s" section on "${page.title}" — scanning full page instead`);
      }
    }

    const titles = page.strategy === "table"
      ? extractTitlesFromTable(textToScan)
      : extractItalicizedTitles(textToScan);

    console.log(`"${page.title}" [${page.strategy}]: ${titles.length} candidate titles found`);

    titles.forEach(title => {
      allCandidates.push({
        title,
        suspected_year: null,
        suspected_country: page.country,
        source: "wikipedia",
        source_confidence: page.confidence,
        wiki_page: page.title,
      });
    });

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nWikipedia sweep complete: ${allCandidates.length} raw candidates from ${WIKI_PAGES.length} pages`);
  return allCandidates;
}