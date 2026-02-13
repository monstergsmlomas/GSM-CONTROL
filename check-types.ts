
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

async function checkTypes() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND (table_name = 'users' OR table_name = 'settings')
        `);
        console.log("COLUMNAS Y TIPOS:");
        res.rows.forEach(row => {
            console.log(`- ${row.table_name}.${row.column_name}: ${row.data_type}`);
        });
        client.release();
        await pool.end();
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

checkTypes();
