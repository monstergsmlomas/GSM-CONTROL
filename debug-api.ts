
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import { getDb } from "./server/db.js";
import { users } from "./server/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

async function debug() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("DATABASE_URL not found");
        process.exit(1);
    }

    const db = getDb(connectionString);

    try {
        console.log("Intentando select a public.users...");
        const result = await db.select().from(users);
        console.log("¡Éxito! Usuarios encontrados:", result.length);
    } catch (error: any) {
        console.error("ERROR CAPTURADO:");
        console.error("Mensaje:", error.message);
        if (error.code) console.error("Código Postgres:", error.code);
        if (error.hint) console.error("Hint:", error.hint);
        process.exit(1);
    }
}

debug();
