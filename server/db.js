
import pg from "pg";
import "dotenv/config";


const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,       // close idle connections after 30s
  connectionTimeoutMillis: 10000, // fail fast if can't connect within 10s
  keepAlive: true,                // send TCP keepalive packets
  keepAliveInitialDelayMillis: 10000,
});

// Test connection on startup
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err.message);
});

export default pool;