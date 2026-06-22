import db from "../db.js";
import "dotenv/config";
import { runDirectorSweep }    from "../helpers/directorSweep.js";
import { runWikipediaSweep }   from "../helpers/wikipediaSweep.js";
import { mergeCandidates }     from "../helpers/mergeCandidates.js";
import { verifyAllCandidates } from "../helpers/tmdbVerify.js";
import { enrichAllCandidates } from "../helpers/tmdbEnrich.js";
import { buildAllTabs }        from "../helpers/buildTabData.js";
import { publishToDatabase }   from "../helpers/publishToDatabase.js";


// Warm up DB connection before the pipeline starts
try {
  await db.query("SELECT 1");
  console.log("✓ Database connection verified");
} catch (err) {
  console.error("✗ Cannot connect to database — aborting:", err.message);
  process.exit(1);
}

console.log("=== Phase A: Collect ===");
const directorResults = await runDirectorSweep();
const wikiResults     = await runWikipediaSweep();

console.log("\n=== Phase B: Merge + Verify ===");
const merged = mergeCandidates(directorResults, wikiResults);
console.log(`Merged candidates: ${merged.length}`);

const { verified, rejected } = await verifyAllCandidates(merged);
console.log(`Verified: ${verified.length}, Rejected: ${rejected.length}`);

console.log("\n=== Phase B: Enrich ===");
const { enriched, failed } = await enrichAllCandidates(verified);
console.log(`Enriched: ${enriched.length}, Failed: ${failed.length}`);

console.log("\n=== Phase B: Regional balance ===");
const tabs = buildAllTabs(enriched);
console.log(`All Africa — Top Rated: ${tabs.ALL.topRated.length}, Latest: ${tabs.ALL.latest.length}`);
console.log(`NG — Top Rated: ${tabs.NG.topRated.length}, Latest: ${tabs.NG.latest.length}`);
console.log(`CM — Top Rated: ${tabs.CM.topRated.length}, Latest: ${tabs.CM.latest.length}`);
console.log(`GH — Top Rated: ${tabs.GH.topRated.length}, Latest: ${tabs.GH.latest.length}`);
console.log(`ZA — Top Rated: ${tabs.ZA.topRated.length}, Latest: ${tabs.ZA.latest.length}`);
console.log(`ARAB — Top Rated: ${tabs.ARAB.topRated.length}, Latest: ${tabs.ARAB.latest.length}`);
console.log(`FR — Top Rated: ${tabs.FR.topRated.length}, Latest: ${tabs.FR.latest.length}`);

console.log("\n=== Phase C: Publish to database ===");
await publishToDatabase(enriched);

console.log("\n=== Pipeline complete ===");