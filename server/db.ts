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

  // Ajuste para Supabase Pro
  max: 8,                    // Más margen en Pro
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("❌ [DB Pool Error]:", err.message);
});

// Test inicial opcional
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Conectado correctamente a Supabase (Pro)");
    client.release();
  } catch (err: any) {
    console.error("❌ Error conectando a Supabase:", err.message);
  }
})();

export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV !== "production",
});