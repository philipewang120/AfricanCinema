
import { applyRegionalBalance } from "./regionalBalance.js";

const PER_TAB_CAP = 25;

// How recent is "latest" — only include films from the last 18 months
const LATEST_CUTOFF_MONTHS = 18;

function getRegion(countryCode) {
  const REGION_GROUPS = {
    NG: "NG", CM: "CM", ZA: "ZA", GH: "GH",
    EG: "ARAB", DZ: "ARAB", MA: "ARAB", TN: "ARAB",
    SN: "FR", ML: "FR", CI: "FR", GN: "FR",
    TD: "FR", CD: "FR", NE: "FR", MR: "FR",
  };
  return REGION_GROUPS[countryCode] || "OTHER";
}

function isRecentEnough(releaseDate) {
  if (!releaseDate) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - LATEST_CUTOFF_MONTHS);
  return new Date(releaseDate) >= cutoff;
}

function buildRegionTab(candidates, cap = PER_TAB_CAP) {
  // Top Rated — sort by confidence score first, then vote_average
  // Filter out zero-vote films from Top Rated since they can't be meaningfully ranked
  const topRated = [...candidates]
    .filter(c => c.vote_count > 0)
    .sort((a, b) =>
      b.confidence_score - a.confidence_score ||
      (b.vote_average ?? 0) - (a.vote_average ?? 0)
    )
    .slice(0, cap);

  // Latest Releases — sort by real release_date (populated by TMDB enrichment)
  // Only include films released within the cutoff window
  const latest = [...candidates]
    .filter(c => c.release_date && isRecentEnough(c.release_date))
    .sort((a, b) => new Date(b.release_date) - new Date(a.release_date))
    .slice(0, cap);

  return {
    topRated,
    latest,
    total: candidates.length,
  };
}

export function buildAllTabs(mergedCandidates) {
  // Group every candidate by region
  const byRegion = {};
  for (const candidate of mergedCandidates) {
    const region = getRegion(candidate.tab_region || candidate.suspected_country);
    if (!byRegion[region]) byRegion[region] = [];
    byRegion[region].push(candidate);
  }

  // Individual region tabs — self-contained, no cross-region competition
  const tabs = {
    NG:   buildRegionTab(byRegion.NG   || []),
    CM:   buildRegionTab(byRegion.CM   || []),
    GH:   buildRegionTab(byRegion.GH   || []),
    ZA:   buildRegionTab(byRegion.ZA   || []),
    ARAB: buildRegionTab(byRegion.ARAB || []),
    FR:   buildRegionTab(byRegion.FR   || []),
  };

  // "All Africa" — only tab using regional balance
  // Top Rated: ranked by confidence + vote_average, balanced across regions
  const allRanked = [...mergedCandidates]
    .filter(c => c.vote_count > 0)
    .sort((a, b) =>
      b.confidence_score - a.confidence_score ||
      (b.vote_average ?? 0) - (a.vote_average ?? 0)
    );

  // Latest: only recent films, sorted by release_date, balanced across regions
  const allRecent = [...mergedCandidates]
    .filter(c => c.release_date && isRecentEnough(c.release_date))
    .sort((a, b) => new Date(b.release_date) - new Date(a.release_date));

  tabs.ALL = {
    topRated: applyRegionalBalance(allRanked, 40),
    latest:   applyRegionalBalance(allRecent, 20),
    total:    mergedCandidates.length,
  };

  return tabs;
}