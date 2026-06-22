

// Percentage allocation for "All Africa" tab — must sum to 100
const REGIONAL_QUOTAS = {
  NG: 0.35,           // Nigeria — biggest market
  CM: 0.20,           // Cameroon
  // Remaining 45% split equally across all other represented regions
};

// Country → region grouping, so individual country codes roll up correctly
const REGION_GROUPS = {
  NG: "NG",
  CM: "CM",
  ZA: "ZA",
  GH: "GH",
  EG: "EG", DZ: "EG", MA: "EG", TN: "EG", // North Africa bucket, tag pending your Arab-tab rename
  SN: "FR", ML: "FR", CI: "FR", GN: "FR", TD: "FR", CD: "FR", NE: "FR", MR: "FR", // Francophone bucket
};

function getRegion(countryCode) {
  return REGION_GROUPS[countryCode] || "OTHER";
}

export function applyRegionalBalance(rankedCandidates, targetCount = 60) {
  // Group candidates by region, each already sorted by confidence/rating internally
  const byRegion = {};
  for (const candidate of rankedCandidates) {
    const region = getRegion(candidate.suspected_country);
    if (!byRegion[region]) byRegion[region] = [];
    byRegion[region].push(candidate);
  }

  const allRegions = Object.keys(byRegion);
  const fixedRegions = Object.keys(REGIONAL_QUOTAS);
  const remainingRegions = allRegions.filter(r => !fixedRegions.includes(r));

  const remainingQuotaShare = remainingRegions.length > 0
    ? (1 - Object.values(REGIONAL_QUOTAS).reduce((a, b) => a + b, 0)) / remainingRegions.length
    : 0;

  const finalQuotas = { ...REGIONAL_QUOTAS };
  remainingRegions.forEach(r => { finalQuotas[r] = remainingQuotaShare; });

  const result = [];
  for (const region of allRegions) {
    const quota = finalQuotas[region] || 0;
    const slotCount = Math.round(targetCount * quota);
    const regionCandidates = byRegion[region] || [];
    result.push(...regionCandidates.slice(0, slotCount));
  }

  // If quotas didn't fill targetCount exactly (rounding, or a region
  // had fewer candidates than its quota), backfill from the overall
  // ranked list, skipping anything already included
  if (result.length < targetCount) {
    const includedIds = new Set(result.map(c => c.tmdb_id));
    for (const candidate of rankedCandidates) {
      if (result.length >= targetCount) break;
      if (!includedIds.has(candidate.tmdb_id)) {
        result.push(candidate);
        includedIds.add(candidate.tmdb_id);
      }
    }
  }

  return result.slice(0, targetCount);
}