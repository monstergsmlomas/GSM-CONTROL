import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pg from "pg";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not found in .env");
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();

    console.log("Adding 'telefono' column...");
    try {
      await client.query(
        `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telefono text;`,
      );
      console.log("✅ 'telefono' column added (or already exists).");
    } catch (e: any) {
      console.error("❌ Error adding 'telefono':", e.message);
    }

    console.log("Adding 'last_seen' column...");
    try {
      await client.query(
        `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT now();`,
      );
      console.log("✅ 'last_seen' column added (or already exists).");
    } catch (e: any) {
      console.error("❌ Error adding 'last_seen':", e.message);
    }

    console.log("Adding 'updated_at' column...");
    try {
      await client.query(
        `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();`,
      );
      console.log("✅ 'updated_at' column added (or already exists).");
    } catch (e: any) {
      console.error("❌ Error adding 'updated_at':", e.message);
    }

    client.release();
    await pool.end();
  } catch (e: any) {
    console.error("General error:", e.message);
  }
}

migrate();
