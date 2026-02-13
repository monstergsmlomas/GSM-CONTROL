
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

async function inspect() {
    let output = "--- DIAGNÓSTICO PROFUNDO ---\n";
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
        fs.writeFileSync(join(__dirname, "result.txt"), "ERROR: DATABASE_URL no encontrada");
        process.exit(1);
    }

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        output += "¡Conexión exitosa!\n";

        const res = await client.query(`
            SELECT table_schema, table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY table_schema
        `);
        
        output += "Tablas 'users' encontradas:\n";
        const schemas = new Set();
        res.rows.forEach(row => schemas.add(row.table_schema));
        
        schemas.forEach(schema => {
            const cols = res.rows.filter(r => r.table_schema === schema).map(r => r.column_name).join(", ");
            output += `Schema [${schema}]: ${cols}\n`;
        });
        
        // Try public specifically
        try {
            const publicCount = await client.query("SELECT COUNT(*) as total FROM public.users");
            output += `Total en public.users: ${publicCount.rows[0].total}\n`;
            
            const sample = await client.query("SELECT * FROM public.users LIMIT 1");
            output += "Columnas en public.users (raw first row keys): " + Object.keys(sample.rows[0]).join(", ") + "\n";
        } catch (e: any) {
            output += "Error al consultar public.users: " + e.message + "\n";
        }

        client.release();
        await pool.end();
        fs.writeFileSync(join(__dirname, "result.txt"), output);
        process.exit(0);
    } catch (error: any) {
        fs.writeFileSync(join(__dirname, "result.txt"), "ERROR: " + error.message);
        process.exit(1);
    }
}

inspect();
