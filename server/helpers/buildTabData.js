
import { applyRegionalBalance } from "./regionalBalance.js";

const PER_TAB_CAP = 25; // top-rated cap and latest-releases cap, per tab

function getRegion(countryCode) {
  const REGION_GROUPS = {
    NG: "NG", CM: "CM", ZA: "ZA", GH: "GH",
    EG: "ARAB", DZ: "ARAB", MA: "ARAB", TN: "ARAB",
    SN: "FR", ML: "FR", CI: "FR", GN: "FR", TD: "FR", CD: "FR", NE: "FR", MR: "FR",
  };
  return REGION_GROUPS[countryCode] || "OTHER";
}

// Splits a region's candidates into top-rated and latest, each capped
function buildRegionTab(candidates, cap = PER_TAB_CAP) {
  // Top Rated — sort by confidence score first, then TMDB vote_average
  // (once TMDB verification has run and populated vote_average on each)
  const topRated = [...candidates]
    .sort((a, b) =>
      b.confidence_score - a.confidence_score ||
      (b.vote_average ?? 0) - (a.vote_average ?? 0)
    )
    .slice(0, cap);

  // Latest Releases — sort by release date, most recent first
  const latest = [...candidates]
    .filter(c => c.suspected_year) // need a year to sort meaningfully
    .sort((a, b) => (b.suspected_year ?? 0) - (a.suspected_year ?? 0))
    .slice(0, cap);

  return { topRated, latest, total: candidates.length };
}

export function buildAllTabs(mergedCandidates) {
  // Group every candidate by region first
  const byRegion = {};
  for (const candidate of mergedCandidates) {
    const region = getRegion(candidate.suspected_country);
    if (!byRegion[region]) byRegion[region] = [];
    byRegion[region].push(candidate);
  }

  // Each individual region tab — self-contained, no cross-region competition
  const tabs = {
    NG:   buildRegionTab(byRegion.NG || []),
    CM:   buildRegionTab(byRegion.CM || []),
    GH:   buildRegionTab(byRegion.GH || []),
    ZA:   buildRegionTab(byRegion.ZA || []),
    ARAB: buildRegionTab(byRegion.ARAB || []),
    FR:   buildRegionTab(byRegion.FR || []),
  };

  // "All Africa" — the ONLY tab using regional-balance quotas,
  // 40 top-rated + 20 latest, pulled from the full merged pool
  const allRanked = [...mergedCandidates].sort((a, b) =>
    b.confidence_score - a.confidence_score || (b.vote_average ?? 0) - (a.vote_average ?? 0)
  );
  const allRecent = [...mergedCandidates]
    .filter(c => c.suspected_year)
    .sort((a, b) => (b.suspected_year ?? 0) - (a.suspected_year ?? 0));

  tabs.ALL = {
    topRated: applyRegionalBalance(allRanked, 40),
    latest:   applyRegionalBalance(allRecent, 20),
    total: 60,
  };

  return tabs;
}