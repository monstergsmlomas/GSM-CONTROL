
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

async function inspect() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'settings' AND table_schema = 'public'
        `);
        console.log("COLUMNS IN SETTINGS:");
        res.rows.forEach(row => {
            console.log(`- ${row.column_name}: ${row.data_type}`);
        });

        const res2 = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public' AND column_name = 'id'
        `);
        console.log("USER ID TYPE:");
        res2.rows.forEach(row => {
            console.log(`- ${row.column_name}: ${row.data_type}`);
        });

        client.release();
        await pool.end();
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

inspect();
