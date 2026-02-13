
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const poolCache = new Map<string, pg.Pool>();

export const getDb = (connectionString?: string) => {
  const finalConnectionString = connectionString || process.env.DATABASE_URL;

  if (!finalConnectionString) {
    throw new Error("No database connection string provided. Check x-db-url header or DATABASE_URL in .env");
  }

  if (!poolCache.has(finalConnectionString)) {
    // Log host only for privacy
    const host = finalConnectionString.includes('@') 
      ? finalConnectionString.split('@')[1].split('/')[0] 
      : 'local/unknown';
    console.log(`[DB] Creating new pool for ${host}`);
    
    const pool = new Pool({
      connectionString: finalConnectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[DB Pool Error] Unexpected error on idle client:', err);
      // pg-pool handles reconnection automatically for new requests
    });

    poolCache.set(finalConnectionString, pool);
  }

  const pool = poolCache.get(finalConnectionString)!;
  return drizzle(pool, { schema });
};
