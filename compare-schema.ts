
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import { users } from "./server/schema.js";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

async function compare() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public'
        `);
        const dbCols = res.rows.map(r => r.column_name);
        
        console.log("DB Columns:", dbCols.join(", "));
        
        // Drizzle columns
        const drizzleCols = Object.values(users).filter(c => c.name).map(c => c.name);
        console.log("Drizzle Columns in schema.ts:", drizzleCols.join(", "));

        for (const dCol of drizzleCols) {
            if (!dbCols.includes(dCol)) {
                console.log(`MISSING IN DB: ${dCol}`);
            }
        }
        
        client.release();
        await pool.end();
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

compare();
