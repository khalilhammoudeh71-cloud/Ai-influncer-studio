import 'dotenv/config';
import * as schema from "../shared/schema";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("[DB] DATABASE_URL is not set! Database operations will fail.");
}

let db: any;

if (process.env.VERCEL) {
  // In serverless (Vercel), use @neondatabase/serverless
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const { Pool } = await import("@neondatabase/serverless");
  const pool = dbUrl ? new Pool({ connectionString: dbUrl }) : null;
  db = pool ? drizzle(pool, { schema }) : null as any;
} else {
  // In local development, use standard node-postgres (pg) to connect directly
  // to Supabase (supporting direct IPv6 connections)
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pgModule = await import("pg");
  const cleanUrl = dbUrl ? dbUrl.split('?')[0] : '';
  const pool = dbUrl ? new pgModule.default.Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  }) : null;
  db = pool ? drizzle(pool, { schema }) : null as any;
}

export { db };
