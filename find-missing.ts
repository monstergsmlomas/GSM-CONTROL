
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

async function findMissingColumn() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    const columns = [
        "id", "email", "trial_ends_at", "subscription_status", 
        "current_period_end", "billing_interval", "plan", 
        "is_auto_renew", "ciclo_de_pago", "sucursales_extra", "phone", "telefono"
    ];

    try {
        const client = await pool.connect();
        for (const col of columns) {
            try {
                await client.query(`SELECT ${col} FROM public.users LIMIT 1`);
                console.log(`OK: ${col}`);
            } catch (e: any) {
                console.log(`FAIL: ${col} - ${e.message}`);
            }
        }
        client.release();
        await pool.end();
    } catch (e: any) {
        console.error("General error:", e.message);
    }
}

findMissingColumn();
