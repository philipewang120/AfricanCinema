import "dotenv/config";
import { runDirectorSweep } from "../helpers/directorSweep.js";
import { runWikipediaSweep } from "../helpers/wikipediaSweep.js";
import { mergeCandidates } from "../helpers/mergeCandidates.js";

const directorResults = await runDirectorSweep();
const wikiResults = await runWikipediaSweep();

const merged = mergeCandidates(directorResults, wikiResults);

console.log(`\nTotal merged candidates: ${merged.length}`);
console.log(`(from ${directorResults.length} director + ${wikiResults.length} wikipedia raw candidates)`);

const multiSource = merged.filter(c => c.source_count > 1);
console.log(`\nMulti-source matches (high confidence): ${multiSource.length}`);
console.log(multiSource.slice(0, 10).map(c =>
  `${c.title} (${c.suspected_year ?? "?"}) — sources: [${c.sources.join(", ")}], score: ${c.confidence_score}`
));
const sameSourceOnly = merged.filter(c => c.source_count > 1 && c.sources.length === 1);
console.log(`\nMerged groups with multiple hits from the SAME source only: ${sameSourceOnly.length}`);
console.log(sameSourceOnly.slice(0, 5).map(c => `${c.title} — ${c.source_count} hits, all from [${c.sources[0]}]`));

console.log(`\nTop 10 by confidence overall:`);
console.log(merged.slice(0, 10).map(c =>
  `${c.title} — score: ${c.confidence_score}, sources: [${c.sources.join(", ")}]`
));