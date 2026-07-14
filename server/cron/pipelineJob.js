
import cron from "node-cron";
import { runDirectorSweep }    from "../helpers/directorSweep.js";
import { runWikipediaSweep }   from "../helpers/wikipediaSweep.js";
import { mergeCandidates }     from "../helpers/mergeCandidates.js";
import { verifyAllCandidates } from "../helpers/tmdbVerify.js";
import { enrichAllCandidates } from "../helpers/tmdbEnrich.js";
import { buildAllTabs }        from "../helpers/buildTabData.js";
import { publishToDatabase }   from "../helpers/publishToDatabase.js";
import { runActorSweep }    from "../helpers/actorSweep.js";
import { runLanguageSweep } from "../helpers/languageSweep.js";
import { generateSitemap } from "../helpers/generateSitemap.js";
import db from "../db.js";

// Track whether a job is currently running — prevents overlap if
// the server somehow triggers twice (e.g. Render restarts mid-job)
let isRunning = false;

export async function runPipeline() {
  if (isRunning) {
    console.log("[Pipeline] Already running — skipping this trigger");
    return;
  }

  isRunning = true;
  const startTime = Date.now();
  console.log(`\n[Pipeline] Starting at ${new Date().toISOString()}`);

  try {
    // Verify DB connection before committing 8+ minutes of work
    await db.query("SELECT 1");
    console.log("[Pipeline] ✓ Database connected");

    // Phase A — Collect
 console.log("\n[Pipeline] Phase A: Collecting candidates...");
const [directorResults, wikiResults, actorResults, languageResults] = await Promise.all([
  runDirectorSweep(),
  runWikipediaSweep(),
  runActorSweep(),
  runLanguageSweep(3), // 3 pages per language = ~1,200 candidates max
]);
 

    // Phase B — Merge, Verify, Enrich
    console.log("\n[Pipeline] Phase B: Merging and verifying...");
    const merged = mergeCandidates( directorResults,wikiResults,actorResults,languageResults);
    console.log(`[Pipeline] Merged: ${merged.length} candidates`);

    const { verified, rejected } = await verifyAllCandidates(merged);
    console.log(`[Pipeline] Verified: ${verified.length}, Rejected: ${rejected.length}`);

    const { enriched, failed } = await enrichAllCandidates(verified);
    console.log(`[Pipeline] Enriched: ${enriched.length}, Failed: ${failed.length}`);

    // Phase B — Regional balance
    console.log("\n[Pipeline] Phase B: Building tab data...");
    const tabs = buildAllTabs(enriched);
    console.log(`[Pipeline] All Africa — Top: ${tabs.ALL.topRated.length}, Latest: ${tabs.ALL.latest.length}`);
    console.log(`[Pipeline] NG — Top: ${tabs.NG.topRated.length}, Latest: ${tabs.NG.latest.length}`);
    console.log(`[Pipeline] CM — Top: ${tabs.CM.topRated.length}, Latest: ${tabs.CM.latest.length}`);

    // Phase C — Publish
    console.log("\n[Pipeline] Phase C: Publishing to database...");
    await publishToDatabase(enriched);

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n[Pipeline] ✓ Complete in ${elapsed} minutes at ${new Date().toISOString()}`);


// Regenerate sitemap after publishing
try {

  console.log("\n[Pipeline] Regenerating sitemap...");
  await generateSitemap();
  console.log("[Pipeline] ✓ Sitemap regenerated");
} catch (err) {
  console.warn("[Pipeline] Failed to log pipeline run:", err.message);
}


    // Log the run to DB so you have a history of when it last ran
    await db.query(
      `INSERT INTO pipeline_runs (ran_at, duration_minutes, candidates_enriched, candidates_rejected)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [new Date().toISOString(), parseFloat(elapsed), enriched.length, rejected.length]
    ).catch(() => {}); // silently skip if table doesn't exist yet

  } catch (err) {
    console.error(`\n[Pipeline] ✗ Failed:`, err.message);
  } finally {
    isRunning = false;
  }
}

// Cron schedule — twice a month:
// "0 3 1,15 * *" = 3:00 AM on the 1st and 15th of every month
// Running at 3 AM avoids peak traffic hours and gives your server breathing room
export function startPipelineCron() {
  const schedule = "0 3 1,15 * *";

  cron.schedule(schedule, () => {
    console.log("[Pipeline] Cron triggered — starting pipeline job");
    runPipeline();
  }, {
    timezone: "Africa/Lagos", // UTC+1, covers most of your target regions
  });

  console.log(`[Pipeline] Cron scheduled: ${schedule} (Africa/Lagos timezone)`);
  console.log(`[Pipeline] Next runs: 1st and 15th of each month at 03:00 WAT`);
}