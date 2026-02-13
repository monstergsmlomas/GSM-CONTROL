
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

async function check() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings'");
        console.log("EXISTS:", res.rows.length > 0);
        
        if (res.rows.length === 0) {
            console.log("Creando tabla settings...");
            await client.query(`
                CREATE TABLE public.settings (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                    phone TEXT
                );
            `);
            console.log("Tabla settings creada.");
        }

        // Check if phone still exists in users to drop it and keep clean
        const colCheck = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone'");
        if (colCheck.rows.length > 0) {
            console.log("Eliminando columna 'phone' de la tabla 'users'...");
            await client.query("ALTER TABLE public.users DROP COLUMN phone");
            console.log("Columna 'phone' eliminada.");
        }

        client.release();
        await pool.end();
        process.exit(0);
    } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
    }
}

check();
