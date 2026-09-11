import { neon } from "@neondatabase/serverless";

// Reuses the same tagged-template client across invocations.
// DATABASE_URL comes from the Neon project dashboard, set as an env var on Vercel.
export const sql = neon(process.env.DATABASE_URL);
