import 'dotenv/config';
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "../shared/schema";

// In serverless (Vercel), use HTTP mode. In local dev, use WebSocket.
if (!process.env.VERCEL) {
  try {
    const wsModule = await import("ws");
    const { neonConfig } = await import("@neondatabase/serverless");
    neonConfig.webSocketConstructor = wsModule.default;
  } catch {
    // ws not available in serverless, that's fine — Neon uses HTTP fetch
  }
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("[DB] DATABASE_URL is not set! Database operations will fail.");
}

const pool = dbUrl ? new Pool({ connectionString: dbUrl }) : null;
export const db = pool ? drizzle(pool, { schema }) : null as any;
