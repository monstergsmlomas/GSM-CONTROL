import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL no está definida en el .env");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },

  // Supabase Pro + Pooler
  max: 8,
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("❌ [DB Pool Error]:", err.message);
});

// Test inicial de conexión
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Conectado correctamente a Supabase (Pro)");
    client.release();
  } catch (err: any) {
    console.error("❌ Error conectando a Supabase:", err.message);
  }
})();

const drizzleInstance = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV !== "production",
});

// Export principal
export const db = drizzleInstance;

// Compatibilidad con código viejo
export const getDb = (_connectionString?: string) => drizzleInstance;