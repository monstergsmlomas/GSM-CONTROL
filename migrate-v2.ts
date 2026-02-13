
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

async function migrate() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log("Conectado. Intentando añadir columna 'phone'...");
        
        try {
            await client.query("ALTER TABLE public.users ADD COLUMN phone TEXT");
            console.log("Columna 'phone' añadida con éxito.");
        } catch (e: any) {
            console.log("Nota sobre 'phone':", e.message);
        }

        const res = await client.query("SELECT * FROM public.users LIMIT 1");
        console.log("Columnas actuales en public.users:", Object.keys(res.rows[0]).join(", "));
        
        client.release();
        await pool.end();
        process.exit(0);
    } catch (error: any) {
        console.error("Error crítico:", error.message);
        process.exit(1);
    }
}

migrate();
