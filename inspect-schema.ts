
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

async function inspectSchema() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("DATABASE_URL not found in .env");
        return;
    }

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    let output = "";

    try {
        const client = await pool.connect();
        
        output += "--- TABLES IN PUBLIC SCHEMA ---\n";
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        
        const tables = tablesRes.rows.map(r => r.table_name);
        if (tables.length === 0) {
            output += "No tables found in public schema.\n";
        } else {
            output += tables.join(", ") + "\n";
        }
        output += "\n--- DETAILED COLUMN INFO ---\n";

        for (const table of tables) {
            output += `\nTable: ${table}\n`;
            const colsRes = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position;
            `, [table]);
            
            colsRes.rows.forEach(r => {
                output += `  - ${r.column_name} (${r.data_type})\n`;
            });
        }

        client.release();
        await pool.end();

        fs.writeFileSync("schema_dump_utf8.txt", output, "utf-8");
        console.log("Schema dump written to schema_dump_utf8.txt");

    } catch (e: any) {
        console.error("Error inspecting schema:", e.message);
    }
}

inspectSchema();
