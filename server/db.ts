
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// We use a simple cache to avoid creating too many pools for the same URL 
// (though in this specific use case, it changes rarely)
const poolCache = new Map<string, pg.Pool>();

export const getDb = (connectionString: string) => {
  if (!poolCache.has(connectionString)) {
    console.log(`[DB] Creating new pool for ${connectionString.split('@')[1]}`); // Log host only for privacy
    const pool = new Pool({
      connectionString,
    });
    poolCache.set(connectionString, pool);
  }

  const pool = poolCache.get(connectionString)!;
  return drizzle(pool, { schema });
};
