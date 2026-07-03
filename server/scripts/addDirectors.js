
import axios from "axios";
import fs from "fs";
import "dotenv/config";


const NEW_DIRECTORS = [
  { name: "Ishaya Bako", country: "NG" },
  { name: "Daniel Emeke Oriahi", country: "NG" },
  { name: "Ifeoma Nkiruka Chukwuogo", country: "NG" },
  { name: "Uyoyou Adia", country: "NG" },
  { name: "Nwamaka Chikezie", country: "NG" },
  { name: "Chika Onu", country: "NG" },
  { name: "Ola Balogun", country: "NG" },
  { name: "Ngozi Onwurah", country: "NG" },
  { name: "Andrew Dosunmu", country: "NG" },
  { name: "Uyaiedu Ikpe-Etim", country: "NG" },
  { name: "Ben Proudfoot", country: "GH" },
  { name: "Zoey Martinson", country: "GH" },
  { name: "John Akomfrah", country: "GH" },
  { name: "Fabrice Éboué", country: "CM" },
  { name: "Achille Brice", country: "CM" },
  { name: "Jean-Pierre Dikongue-Pipa", country: "CM" },
  { name: "Boubakar Diallo", country: "BF" },
  { name: "Dani Kouyaté", country: "BF" },
  { name: "Apolline Traoré", country: "BF" },
  { name: "Gaston Kaboré", country: "BF" },
  { name: "Idrissa Ouedraogo", country: "BF" },
  { name: "Cheick Oumar Sissoko", country: "ML" },
  { name: "Alain Gomis", country: "SN" },
  { name: "Ababacar Samb-Makharam", country: "SN" },
  { name: "Thierno Faty Sow", country: "SN" },
  { name: "Rachid Bouchareb", country: "DZ" },
  { name: "Safi Faye", country: "SN" },
  { name: "Jamie Uys", country: "ZA" },
  { name: "Gray Hofmeyr", country: "ZA" },
  { name: "Gavin Wood", country: "ZA" },
  { name: "Lemohang Jeremiah Mosese", country: "ZA" },
  { name: "Wayne Kramer", country: "ZA" },
  { name: "Francois Verster", country: "ZA" },
  { name: "Ralph Ziman", country: "ZA" },
  { name: "Neill Blomkamp", country: "ZA" },
  { name: "Steven Silver", country: "ZA" },
  { name: "Jerome Pikwane", country: "ZA" },
  { name: "Pippa Ehrlich", country: "ZA" },
  { name: "Oliver Hermanus", country: "ZA" },
  { name: "Henry Cornelius", country: "ZA" },
  { name: "Rungano Nyoni", country: "ZA" },
  { name: "Wanuri Kahiu", country: "KE" },
  { name: "Kivu Ruhorahoza", country: "RW" },
  { name: "Raymond Rajaonarivelo", country: "MG" },
  { name: "Haile Gerima", country: "ET" },
  { name: "Jessica Beshir", country: "ET" },
  { name: "Suhaib Gasmelbari", country: "SD" },
  { name: "Ibrahim Shaddad", country: "SD" },
  { name: "Henri Duparc", country: "CI" },
  { name: "Désiré Ecaré", country: "CI" },
  { name: "Philippe Lacôte", country: "CI" },
  { name: "Adamu Halilu", country: "NE" },
  { name: "Mohamed Abderrahman Tazi", country: "MA" },
  { name: "Abdelmajid R'chich", country: "MA" },
  { name: "Hamid Benani", country: "MA" },
  { name: "Mostafa Derkaoui", country: "MA" },
  { name: "Med Hondo", country: "MA" },
  { name: "Ahmed Bouanani", country: "MA" },
  { name: "Faouzi Bensaïdi", country: "MA" },
  { name: "Mounia Meddour", country: "MA" },
  { name: "Alaa Eddine Aljem", country: "MA" },
  { name: "Maryam Touzani", country: "MA" },
  { name: "Meriem Bennani", country: "MA" },
  { name: "Farida Benlyazid", country: "MA" },
  { name: "Niazi Mostafa", country: "EG" },
  { name: "Chadi Abdel Salam", country: "EG" },
  { name: "Atef El-Tayeb", country: "EG" },
  { name: "Salah Abouseif", country: "EG" },
  { name: "Togo Mizrahi", country: "EG" },
  { name: "Sherif Arafa", country: "EG" },
  { name: "Ahmad Nader Galal", country: "EG" },
  { name: "Ahmed al-Gendy", country: "EG" },
  { name: "Hala Lotfy", country: "EG" },
  { name: "Jehane Noujaim", country: "EG" },
  { name: "Tamer El Said", country: "EG" },
  { name: "Hadi El Bagoury", country: "EG" },
  { name: "Omar El Zohairy", country: "EG" },
  { name: "Ayten Amin", country: "EG" },
  { name: "Abu Bakr Shawky", country: "EG" },
  { name: "Khaled Marei", country: "EG" },
  { name: "Peter Mimi", country: "EG" },
  { name: "Mohamed Zinet", country: "DZ" },
  { name: "Djouhra Abouda", country: "DZ" },
  { name: "Mehdi Charef", country: "DZ" },
  { name: "Tariq Teguia", country: "DZ" },
  { name: "Farouk Beloufa", country: "DZ" },
  { name: "Narimane Mari", country: "DZ" },
  { name: "Rayhana Obermeyer", country: "DZ" },
  { name: "Abdellatif Kechiche", country: "TN" },
  { name: "Mohamed Ben Attia", country: "TN" },
  { name: "Mehdi Barsaoui", country: "TN" },
  { name: "Youssef Chebbi", country: "TN" },
  { name: "Alaeddine Slim", country: "TN" },
  { name: "Yasir Alyasiri", country: "ARAB" },
  { name: "Tarek Alarian", country: "ARAB" },
  { name: "Suzannah Mirghani", country: "SD" },
  { name: "Mohamed Diab", country: "EG" },
  { name: "Youssef Chahine", country: "EG" },
  { name: "Zippy Kimundu", country: "KE" },
  { name: "Marie-Clémentine Dusabejambo", country: "RW" },
  { name: "sam pollard", country: "ZA" },
  { name: "Oluseyi Asurf", country: "NG" },
  { name: "Tchidi Chikere", country: "NG" },
  { name: "Zipporah Nyaruri", country: "KE" },
  { name: "Meryam Joobeur", country: "TN" },
  { name: "Farida Zahran", country: "EG" }








];

const RETRY_ALIASES = {

};

async function resolveDirectorId(director) {
  const tryNames = [director.name, ...(RETRY_ALIASES[director.name] || [])];
  for (const nameAttempt of tryNames) {
    try {
      const res = await axios.get("https://api.themoviedb.org/3/search/person", {
        params: { query: nameAttempt },
        headers: { Authorization: `Bearer ${process.env.TMDB_BEARER}` },
      });
      const match = res.data.results[0];
      if (match) {
        return {
          name: director.name,
          matched_as: nameAttempt !== director.name ? nameAttempt : undefined,
          country: director.country,
          tmdb_id: match.id,
          profile_path: match.profile_path ?? null,
        };
      }
    } catch (err) {
      console.error(`Error resolving ${nameAttempt}:`, err.message);
    }
    await new Promise(r => setTimeout(r, 250));
  }
  return { name: director.name, country: director.country, tmdb_id: null };
}

async function addDirectors() {
  // Load existing database
  const existing = JSON.parse(
    fs.readFileSync("./config/directorDatabase.json", "utf-8")
  );
  const existingIds = new Set(existing.map(d => d.tmdb_id).filter(Boolean));
  const existingNames = new Set(existing.map(d => d.name.toLowerCase()));

  console.log(`Existing directors: ${existing.length}`);
  console.log(`New directors to process: ${NEW_DIRECTORS.length}`);

  const resolved = [];
  const skipped = [];
  const notFound = [];

  for (const director of NEW_DIRECTORS) {
    // Skip if name already exists (case-insensitive)
    if (existingNames.has(director.name.toLowerCase())) {
      console.log(`⟳ Already exists: ${director.name}`);
      skipped.push(director.name);
      continue;
    }

    const result = await resolveDirectorId(director);

    if (!result.tmdb_id) {
      console.log(`✗ NOT FOUND: ${director.name}`);
      notFound.push(director.name);
      continue;
    }

    // Skip if TMDB id already exists under a different name entry
    if (existingIds.has(result.tmdb_id)) {
      console.log(`⟳ TMDB id ${result.tmdb_id} already in database (${director.name})`);
      skipped.push(director.name);
      continue;
    }

    console.log(`✓ ${result.tmdb_id}  ${director.name} (${director.country})`);
    resolved.push(result);
  }

  // Merge and save
  const merged = [...existing, ...resolved];
  fs.writeFileSync(
    "./config/directorDatabase.json",
    JSON.stringify(merged, null, 2)
  );

  console.log(`\n=== Summary ===`);
  console.log(`Added:     ${resolved.length}`);
  console.log(`Skipped (duplicate): ${skipped.length}`);
  console.log(`Not found on TMDB:   ${notFound.length}`);
  console.log(`Total directors now: ${merged.length}`);

  if (notFound.length) {
    console.log(`\nNeeds manual TMDB lookup:`, notFound.join(", "));
  }
}

addDirectors();