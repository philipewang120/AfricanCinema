import "dotenv/config";
import { runDirectorSweep } from "../helpers/directorSweep.js";




const results = await runDirectorSweep();
const lowVoteCandidates = results.filter(c => c.vote_average === 0 || c.vote_average < 3);
console.log(`\nLow/zero vote candidates (indie signal): ${lowVoteCandidates.length}`);
console.log(lowVoteCandidates.slice(0, 10).map(c => `${c.title} — ${c.matched_director} (${c.suspected_year})`));

