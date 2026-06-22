

const REGIONAL_QUOTAS = {
  NG: 0.35,
  CM: 0.20,
};

function getRegion(countryCode) {
  const REGION_GROUPS = {
    NG: "NG", CM: "CM", ZA: "ZA", GH: "GH",
    EG: "ARAB", DZ: "ARAB", MA: "ARAB", TN: "ARAB",
    SN: "FR", ML: "FR", CI: "FR", GN: "FR",
    TD: "FR", CD: "FR", NE: "FR", MR: "FR",
  };
  return REGION_GROUPS[countryCode] || "OTHER";
}

export function applyRegionalBalance(rankedCandidates, targetCount) {
  const byRegion = {};
  for (const candidate of rankedCandidates) {
    const region = getRegion(candidate.tab_region || candidate.suspected_country);
    if (!byRegion[region]) byRegion[region] = [];
    byRegion[region].push(candidate);
  }

  const allRegions = Object.keys(byRegion);
  const fixedRegions = Object.keys(REGIONAL_QUOTAS);
  const remainingRegions = allRegions.filter(r => !fixedRegions.includes(r));

  const fixedTotal = Object.values(REGIONAL_QUOTAS).reduce((a, b) => a + b, 0);
  const remainingQuotaShare = remainingRegions.length > 0
    ? (1 - fixedTotal) / remainingRegions.length
    : 0;

  const finalQuotas = { ...REGIONAL_QUOTAS };
  remainingRegions.forEach(r => { finalQuotas[r] = remainingQuotaShare; });

  const result = [];
  for (const region of allRegions) {
    const quota = finalQuotas[region] || 0;
    const slotCount = Math.round(targetCount * quota);
    result.push(...(byRegion[region] || []).slice(0, slotCount));
  }

  // Backfill if rounding left us short of targetCount
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