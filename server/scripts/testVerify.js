
import "dotenv/config";
import { runDirectorSweep } from "../helpers/directorSweep.js";
import { runWikipediaSweep } from "../helpers/wikipediaSweep.js";
import { mergeCandidates } from "../helpers/mergeCandidates.js";
import { verifyAllCandidates } from "../helpers/tmdbVerify.js";

const directorResults = await runDirectorSweep();
const wikiResults = await runWikipediaSweep();
const merged = mergeCandidates(directorResults, wikiResults);

console.log(`\nStarting TMDB verification on ${merged.length} candidates — this will take a few minutes...`);
const { verified, rejected } = await verifyAllCandidates(merged);

console.log(`\nSample verified candidate:`, verified[0]);
console.log(`\nRejected (no TMDB match) sample:`, rejected.slice(0, 10).map(c => c.title));