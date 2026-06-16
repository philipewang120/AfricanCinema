import db from "../db.js";

// Generate a username from email by taking the part before "@" and making it lowercase, replacing non-alphanumeric characters with underscores
export function generateUsername(email) {
  return email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

//ensure user has a username, if not generate one from email and handle duplicates by appending a number
export async function ensureUsername(userId, email) {
  const existing = await db.query("SELECT username FROM users WHERE id = $1", [userId]);
  if (!existing.rows[0].username) {
    const base = generateUsername(email);
    let username = base;
    let counter = 1;
    // Handle duplicates by appending a number
    while (true) {
      const taken = await db.query("SELECT id FROM users WHERE username = $1", [username]);
      if (taken.rows.length === 0) break;
      username = `${base}${counter++}`;
    }
    await db.query("UPDATE users SET username = $1 WHERE id = $2", [username, userId]);
    return username;
  }
  return existing.rows[0].username;
}
// Get user role (admin or user) from admins table
export async function getUserRole(userId) {
  const result = await db.query(
    "SELECT role FROM admins WHERE user_id = $1",
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].role : null;
}