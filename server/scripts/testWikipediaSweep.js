
import "dotenv/config";
import { runWikipediaSweep } from "../helpers/wikipediaSweep.js";

const results = await runWikipediaSweep();
console.log(`Sample of first 15 candidates:`, results.slice(0, 15).map(c => c.title));
console.log(`Total candidates: ${results.length}`);