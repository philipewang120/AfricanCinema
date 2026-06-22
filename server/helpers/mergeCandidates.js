const SOURCE_WEIGHTS = {
  director_sweep: 3,
  tmdb_discover: 2,
  wikipedia: 2,
  community: 3,
  admin_json: 5,
  rss: 1,
};

function extractTrailingNumber(title = "") {
  const match = title.trim().match(/\b(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

function normalizeTitle(title = "") {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) =>
      i === 0 ? j : j === 0 ? i : 0
    )
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 +
            Math.min(
              dp[i - 1][j],
              dp[i][j - 1],
              dp[i - 1][j - 1]
            );
    }
  }

  return dp[a.length][b.length];
}

function titlesMatch(a, b, yearA, yearB) {
  const normA = normalizeTitle(a);
  const normB = normalizeTitle(b);

  if (!normA || !normB) return false;

  const numA = extractTrailingNumber(a);
  const numB = extractTrailingNumber(b);

  if (numA !== numB) return false;

  const yearCompatible =
    !yearA ||
    !yearB ||
    Math.abs(yearA - yearB) <= 1;

  if (normA === normB) {
    return yearCompatible;
  }

  const similarity =
    1 - levenshtein(normA, normB) /
      Math.max(normA.length, normB.length);

  return similarity >= 0.88 && yearCompatible;
}

function scoreCandidateGroup(group) {
  const uniqueSources = new Set(group.map(c => c.source));

  let score = [...uniqueSources].reduce(
    (sum, source) => sum + (SOURCE_WEIGHTS[source] || 1),
    0
  );

  if (uniqueSources.size >= 3) {
    score += 2;
  }

  return score;
}

function selectBestCandidate(group) {
  return group.reduce((best, candidate) =>
    (SOURCE_WEIGHTS[candidate.source] || 0) >
    (SOURCE_WEIGHTS[best.source] || 0)
      ? candidate
      : best
  );
}

export function mergeCandidates(...candidateArrays) {
  const allCandidates = candidateArrays.flat();

  const groups = [];
  const tmdbGroups = new Map();

  for (const candidate of allCandidates) {

    // -------------------------
    // PASS 1: TMDB ID wins
    // -------------------------
    if (candidate.tmdb_id && tmdbGroups.has(candidate.tmdb_id)) {
      tmdbGroups.get(candidate.tmdb_id).push(candidate);
      continue;
    }

    // -------------------------
    // PASS 2: Fuzzy title/year
    // -------------------------
    let matchingGroup = groups.find(group =>
      titlesMatch(
        candidate.title,
        group[0].title,
        candidate.suspected_year,
        group[0].suspected_year
      )
    );

    if (!matchingGroup) {
      matchingGroup = [];
      groups.push(matchingGroup);
    }

    matchingGroup.push(candidate);

    // Register TMDB lookup for future matches
    if (candidate.tmdb_id) {
      tmdbGroups.set(candidate.tmdb_id, matchingGroup);
    }
  }

  const merged = groups.map(group => {
    const best = selectBestCandidate(group);

    return {
      title: best.title,

      suspected_year:
        best.suspected_year ??
        group.find(c => c.suspected_year)?.suspected_year ??
        null,

      suspected_country:
        best.suspected_country ??
        group.find(c => c.suspected_country)?.suspected_country ??
        null,

      tmdb_id:
        best.tmdb_id ??
        group.find(c => c.tmdb_id)?.tmdb_id ??
        null,

      sources: [...new Set(group.map(c => c.source))],

      source_count: new Set(group.map(c => c.source)).size,

      confidence_score: scoreCandidateGroup(group),

      raw_candidates: group,
    };
  });

  merged.sort(
    (a, b) =>
      b.confidence_score - a.confidence_score ||
      b.source_count - a.source_count
  );

  return merged;
}