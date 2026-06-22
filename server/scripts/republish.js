import "dotenv/config";
import db from "../db.js";


async function republish() {
  try {
    await db.query("SELECT 1");
    console.log("✓ Database connected");

    const result = await db.query(
      `UPDATE african_movies
       SET status = CASE
         WHEN confidence_score >= 3 THEN 'approved'
         ELSE 'pending'
       END
       WHERE status != 'approved' OR confidence_score >= 3
       RETURNING id, title, status, confidence_score`
    );

    const approved = result.rows.filter(r => r.status === "approved").length;
    const pending  = result.rows.filter(r => r.status === "pending").length;

    console.log(`\nRepublish complete:`);
    console.log(`  Approved: ${approved}`);
    console.log(`  Pending:  ${pending}`);
    console.log(`  Total updated: ${result.rows.length}`);

  } catch (err) {
    console.error("Republish failed:", err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

republish();