
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
        
        const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log("TABLES:", tables.rows.map(r => r.table_name).join(", "));

        const colsSettings = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'settings'");
        console.log("SETTINGS COLUMNS:");
        colsSettings.rows.forEach(r => console.log(`- ${r.column_name}: ${r.data_type}`));

        const colsUsers = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id'");
        console.log("USERS COLUMNS:");
        colsUsers.rows.forEach(r => console.log(`- ${r.column_name}: ${r.data_type}`));

        client.release();
        await pool.end();
    } catch (e: any) {
        console.error(e);
    }
}

check();
