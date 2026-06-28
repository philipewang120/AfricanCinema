
import axios from "axios";
import fs from "fs";
import "dotenv/config";

const NEW_ACTORS = [
  { name: "Patience Ozokwor",        country: "NG" },
  { name: "Jackie Appiah",           country: "GH" },
  { name: "Richard Mofe-Damijo",     country: "NG" },
  { name: "Leleti Khumalo",          country: "ZA" },
  { name: "Nadia Buari",             country: "GH" },
  { name: "Kanayo O. Kanayo",        country: "NG" },
  { name: "Ramsey Nouah",            country: "NG" },
  { name: "Joseph Olita",            country: "KE" },
  { name: "Genevieve Nnaji",         country: "NG" },
  { name: "Osita Iheme",             country: "NG" },
  { name: "Jim Iyke",                country: "NG" },
  { name: "Nkem Owoh",               country: "NG" },
  { name: "Segun Arinze",            country: "NG" },
  { name: "Amaechi Muonagor",        country: "NG" },
  { name: "Bovi Ugbona",             country: "NG" },
  { name: "Sophie Alakija",          country: "NG" },
  { name: "Charles Inojie",          country: "NG" },
  { name: "Epule Jeffrey",           country: "CM" },
  { name: "Syndy Emade",             country: "CM" },
  { name: "Alexx Ekubo",             country: "NG" },
  { name: "Michel Gohou",            country: "CI" },
  { name: "Ildevert Méda",           country: "BF" },
  { name: "Thabang Molaba",          country: "ZA" },
  { name: "Genoveva Umeh",           country: "NG" },
  { name: "Tobi Bakre",              country: "NG" },
  { name: "Timini Egbuson",          country: "NG" },
  { name: "Thandolwethu Zondi",      country: "ZA" },
  { name: "Deyemi Okanlawon",        country: "NG" },
  { name: "Teniola Aladese",         country: "NG" },
  { name: "Cindy Mahlangu",          country: "ZA" },
  { name: "William Benson",          country: "NG" },
  { name: "Shine Rosman",            country: "NG" },
  { name: "Scarlet Gomez",           country: "NG" },
  { name: "Jesse Suntele",           country: "ZA" },
  { name: "Nancy Isime",             country: "NG" },
  { name: "Gbubemi Ejeye",           country: "NG" },
  { name: "Wiseman Mncube",          country: "ZA" },
  { name: "Kunle Remi",              country: "NG" },
  { name: "Blessing Lung'aho",       country: "KE" },
  { name: "Mercy Aigbe",             country: "NG" },
  { name: "Uche Montana",            country: "NG" },
  { name: "Onyinye Odokoro",         country: "NG" },
  { name: "Uzor Arukwe",             country: "NG" },
  { name: "Nse Ikpe-Etim",           country: "NG" },
  { name: "James Gardiner",          country: "GH" },
  { name: "Bolaji Ogunmola",         country: "NG" },
  { name: "Bucci Franklin",          country: "NG" },
  { name: "Thapelo Mokoena",         country: "ZA" },
  { name: "Daniel Etim Effiong",     country: "NG" },
  { name: "Mbissine Thérèse Diop",   country: "SN" },
];

const RETRY_ALIASES = {
  "Kanayo O. Kanayo":      ["Kanayo O Kanayo", "Kenneth Kanayo"],
  "Richard Mofe-Damijo":   ["Richard Mofe Damijo", "RMD"],
  "Nse Ikpe-Etim":         ["Nse Ikpe Etim"],
  "Bovi Ugbona":           ["Bovi"],
  "Mbissine Thérèse Diop": ["Mbissine Therese Diop"],
  "Thandolwethu Zondi":    ["Olly Zondi", "Thandolwethu Olly Zondi"],
  "Blessing Lung'aho":     ["Blessing Lungaho"],
};

async function resolveActorId(actor) {
  const tryNames = [actor.name, ...(RETRY_ALIASES[actor.name] || [])];

  for (const nameAttempt of tryNames) {
    try {
      const res = await axios.get("https://api.themoviedb.org/3/search/person", {
        params: { query: nameAttempt },
        headers: { Authorization: `Bearer ${process.env.TMDB_BEARER}` },
      });
      const match = res.data.results[0];
      if (match) {
        return {
          name:         actor.name,
          matched_as:   nameAttempt !== actor.name ? nameAttempt : undefined,
          country:      actor.country,
          tmdb_id:      match.id,
          profile_path: match.profile_path ?? null,
          known_for:    match.known_for?.map(k => k.title || k.name) ?? [],
        };
      }
    } catch (err) {
      console.error(`Error resolving ${nameAttempt}:`, err.message);
    }
    await new Promise(r => setTimeout(r, 250));
  }

  return { name: actor.name, country: actor.country, tmdb_id: null };
}

async function addActors() {
  // Load or create actorDatabase.json
  const dbPath = "./config/actorDatabase.json";
  const existing = fs.existsSync(dbPath)
    ? JSON.parse(fs.readFileSync(dbPath, "utf-8"))
    : [];

  const existingIds   = new Set(existing.map(a => a.tmdb_id).filter(Boolean));
  const existingNames = new Set(existing.map(a => a.name.toLowerCase()));

  console.log(`Existing actors: ${existing.length}`);
  console.log(`New actors to process: ${NEW_ACTORS.length}`);

  const resolved = [];
  const skipped  = [];
  const notFound = [];

  for (const actor of NEW_ACTORS) {
    if (existingNames.has(actor.name.toLowerCase())) {
      console.log(`⟳ Already exists: ${actor.name}`);
      skipped.push(actor.name);
      continue;
    }

    const result = await resolveActorId(actor);

    if (!result.tmdb_id) {
      console.log(`✗ NOT FOUND: ${actor.name}`);
      notFound.push(actor.name);
      continue;
    }

    if (existingIds.has(result.tmdb_id)) {
      console.log(`⟳ TMDB id ${result.tmdb_id} already exists (${actor.name})`);
      skipped.push(actor.name);
      continue;
    }

    console.log(`✓ ${result.tmdb_id}  ${actor.name} (${actor.country})${result.matched_as ? ` → matched as "${result.matched_as}"` : ""}`);
    resolved.push(result);
  }

  const merged = [...existing, ...resolved];
  fs.writeFileSync(dbPath, JSON.stringify(merged, null, 2));

  console.log(`\n=== Summary ===`);
  console.log(`Added:               ${resolved.length}`);
  console.log(`Skipped (duplicate): ${skipped.length}`);
  console.log(`Not found on TMDB:   ${notFound.length}`);
  console.log(`Total actors now:    ${merged.length}`);

  if (notFound.length) {
    console.log(`\nNeeds manual TMDB lookup:`, notFound.join(", "));
  }
}

addActors();