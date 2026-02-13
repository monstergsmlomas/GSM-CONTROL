
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

async function migrate() {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
        console.error("ERROR: DATABASE_URL no encontrada");
        process.exit(1);
    }

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log("¡Conexión exitosa! Aplicando migración...");

        // Añadir columna phone si no existe
        await client.query(`
            ALTER TABLE public.users 
            ADD COLUMN IF NOT EXISTS phone TEXT;
        `);
        
        console.log("Columna 'phone' añadida o ya existente.");

        client.release();
        await pool.end();
        process.exit(0);
    } catch (error: any) {
        console.error("ERROR en la migración:", error.message);
        process.exit(1);
    }
}

migrate();
