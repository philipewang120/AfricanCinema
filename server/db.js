
import pg from "pg";
import "dotenv/config";


const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
});
(async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Connected to Neon:", result.rows[0]);
  } catch (err) {
    console.error("❌ Database connection failed:");
    console.error(err);
  }
})();

// Test connection on startup
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err.message);
});

export default pool;