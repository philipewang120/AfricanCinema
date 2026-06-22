

// scripts/resolveDirectorIds.js — run ONCE locally, not part of the bi-weekly cron
import axios from "axios";
import fs from "fs";
import "dotenv/config";

// Each entry: { name, country } — country drives the confidence-scoring
// cross-check (Phase B "country_match" signal) and your tab filtering (NG/CM/ZA/GH/EG)
const AFRICAN_DIRECTORS_RAW = [
  // ── NOLLYWOOD (Nigeria) ──
  { name: "Funke Akindele", country: "NG" },
  { name: "Niyi Akinmolayan", country: "NG" },
  { name: "Kemi Adetiba", country: "NG" },
  { name: "Kayode Kasum", country: "NG" },
  { name: "Biodun Stephen", country: "NG" },
  { name: "Moses Inwang", country: "NG" },
  { name: "Tope Adebayo", country: "NG" },
  { name: "Robert Peters", country: "NG" },
  { name: "Loukman Ali", country: "NG" },
  { name: "Kunle Afolayan", country: "NG" },
  { name: "Tunde Kelani", country: "NG" },
  { name: "Izu Ojukwu", country: "NG" },
  { name: "Mildred Okwo", country: "NG" },
  { name: "C.J. Obasi", country: "NG" },
  { name: "Newton Aduaka", country: "NG" },
  { name: "Lancelot Oduwa Imasuen", country: "NG" },
  { name: "Jeta Amata", country: "NG" },
  { name: "Ramsey Nouah", country: "NG" },
  { name: "Femi Odugbemi", country: "NG" },
  { name: "Chico Ejiro", country: "NG" },
  { name: "Offie Darlington", country: "NG" },
  { name: "Toka McBaror", country: "NG" },
  { name: "Teco Benson", country: "NG" },
  { name: "Andy Amenechi", country: "NG" },

  // ── CAMEROON ──
  { name: "Jean-Pierre Bekolo", country: "CM" },
  { name: "Bassek ba Kobhio", country: "CM" },
  { name: "Rosine Mbakam", country: "CM" },
  { name: "Nkanya Nkwai", country: "CM" },
  { name: "Samantha Biffot", country: "CM" },
  { name: "Max Ngassa", country: "CM" },
  { name: "Frank Thierry Lea Malle", country: "CM" },
  { name: "Enah Johnscott", country: "CM" },
  { name: "Daniel Kamwa", country: "CM" },
  { name: "Jean-Marie Téno", country: "CM" },
  { name: "Joséphine Ndagnou", country: "CM" },
  { name: "Ebénézer Kepombia", country: "CM" }, 
    { name: "Kang Quintus", country: "CM" },

  // ── GHANA ──
  { name: "Shirley Frimpong-Manso", country: "GH" },
  { name: "Kwaw Ansah", country: "GH" },
  { name: "Blitz Bazawule", country: "GH" },
  { name: "Leila Djansi", country: "GH" },
  { name: "Peter Sedufia", country: "GH" },
  { name: "King Ampaw", country: "GH" },
  { name: "Frank Rajah Arase", country: "GH" },
  { name: "Socrate Safo", country: "GH" },
  { name: "Pascal Amanfo", country: "GH" },
  { name: "Samuel K. Nkansah", country: "GH" },
  { name: "Nii Kwate Owoo", country: "GH" },
  { name: "Akosua Adoma Owusu", country: "GH" },
  { name: "Ivan Quashigah", country: "GH" },
  { name: "Abdul Salam Mumuni", country: "GH" },

  // ── SOUTH AFRICA ──
  { name: "Darrell Roodt", country: "ZA" },
  { name: "Gavin Hood", country: "ZA" },
  { name: "Oliver Schmitz", country: "ZA" },
  { name: "Jahmil X.T. Qubeka", country: "ZA" },
  { name: "John Kani", country: "ZA" },
  { name: "Sara Blecher", country: "ZA" },
  { name: "Katleho Ramaphakela", country: "ZA" },
  { name: "Akin Omotoso", country: "ZA" },
  { name: "Madoda Ncayiyana", country: "ZA" },
  { name: "Ramadan Suleman", country: "ZA" },
  { name: "Ian Gabriel", country: "ZA" },
  { name: "Jenna Bass", country: "ZA" },
  { name: "Mandla Dube", country: "ZA" },
  { name: "Norman Maake", country: "ZA" },
  { name: "Donald Molosi", country: "ZA" },

  // ── FRANCOPHONE AFRICA (multi-country) ──
  { name: "Ousmane Sembène", country: "SN" },
  { name: "Souleymane Cissé", country: "ML" },
  { name: "Djibril Diop Mambéty", country: "SN" },
  { name: "Abderrahmane Sissako", country: "MR" }, // Mauritania — also see Arab Africa note below
  { name: "Mahamat-Saleh Haroun", country: "TD" },
  { name: "Mati Diop", country: "SN" },
  { name: "Ramata-Toulaye Sy", country: "SN" },
  { name: "Oumarou Ganda", country: "NE" },
  { name: "Cheik Doukouré", country: "GN" },
  { name: "Mohamed Camara", country: "GN" },
  { name: "Fadika Kramo-Lanciné", country: "CI" },
  { name: "Roger Gnoan M'Bala", country: "CI" },
  { name: "Alex Ogou", country: "CI" },
  { name: "Djo Tunda Wa Munga", country: "CD" },
  { name: "Balufu Bakupa-Kanyinda", country: "CD" },

  // ── ARAB / NORTH AFRICA ──
  { name: "Youssef Chahine", country: "EG" },
  { name: "Merzak Allouache", country: "DZ" },
  { name: "Nabil Ayouch", country: "MA" },
  { name: "Kaouther Ben Hania", country: "TN" },
  { name: "Yousry Nasrallah", country: "EG" },
  { name: "Nouri Bouzid", country: "TN" },
  { name: "Marwan Hamed", country: "EG" },
  { name: "Atef Salem", country: "EG" },
  { name: "Moufida Tlatli", country: "TN" },
  { name: "Tewfik Saleh", country: "EG" },
  { name: "Mohamed Khan", country: "EG" },
  { name: "Amr Salama", country: "EG" },
  { name: "Ahmed Abdalla", country: "EG" },
  // Note: Hany Abu-Assad (Palestinian) intentionally excluded —
  // outside African Union geography your other regions follow.
  // Add back manually if you want a broader "Arab cinema" definition.
];
const RETRY_ALIASES = {
  
};



async function resolveDirectorId(director) {
  try {
    const res = await axios.get("https://api.themoviedb.org/3/search/person", {
      params: { query: director.name },
      headers: { Authorization: `Bearer ${process.env.TMDB_BEARER}` },
    });
    const match = res.data.results[0];
    return {
      name: director.name,
      country: director.country,
      tmdb_id: match?.id ?? null,
      profile_path: match?.profile_path ?? null,
      tmdb_known_for: match?.known_for?.map(k => k.title || k.name) ?? [],
    };
  } catch (err) {
    console.error(`Failed to resolve ${director.name}:`, err.message);
    return { name: director.name, country: director.country, tmdb_id: null };
  }
}

async function buildDirectorDatabase() {
  const resolved = [];

  for (const director of AFRICAN_DIRECTORS_RAW) {
    const result = await resolveDirectorId(director);
    resolved.push(result);

    const status = result.tmdb_id ? `✓ ${result.tmdb_id}` : "✗ NOT FOUND";
    console.log(`${status}  ${director.name} (${director.country})`);

    await new Promise(r => setTimeout(r, 250)); // gentle rate limiting
  }

  const notFound = resolved.filter(r => !r.tmdb_id);
  console.log(`\n${resolved.length - notFound.length}/${resolved.length} resolved.`);
  if (notFound.length) {
    console.log("Not found, needs manual check:", notFound.map(r => r.name).join(", "));
  }

  fs.writeFileSync("./directorDatabase.json", JSON.stringify(resolved, null, 2));
  console.log("\nSaved to ./directorDatabase.json");
}

buildDirectorDatabase();