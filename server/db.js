import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

//const db = new pg.Pool({
  //connectionString: process.env.DATABASE_URL,
 // ssl: { rejectUnauthorized: false },
//});


const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "African Cinema",
  password: "tutoPostgres@123",
  port: 5433,
});

db.connect();
export default db;