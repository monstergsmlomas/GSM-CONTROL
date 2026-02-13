
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import { getDb } from "./server/db.js";
import { users, settings } from "./server/schema.js";
import { eq } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

async function debug() {
    const connectionString = process.env.DATABASE_URL;
    const db = getDb(connectionString);

    try {
        console.log("Intentando JOIN entre users y settings...");
        const result = await db.select({
            user: users,
            setting: settings
        })
        .from(users)
        .leftJoin(settings, eq(users.id, settings.userId));
        
        console.log("Éxito. Filas:", result.length);
    } catch (e: any) {
        console.error("ERROR EN JOIN:");
        console.error(e);
        process.exit(1);
    }
}

debug();
