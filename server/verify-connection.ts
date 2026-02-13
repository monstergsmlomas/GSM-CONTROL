
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getDb } from "./db.js";
import { users } from "./schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

async function verify() {
    console.log("--- INICIANDO VERIFICACIÓN DE CONEXIÓN ---");
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
        console.error("ERROR: DATABASE_URL no encontrada en .env");
        return;
    }

    console.log("Probando conexión a:", dbUrl.split('@')[1] || "URL");

    try {
        const db = getDb(dbUrl);
        const allUsers = await db.select().from(users);
        
        console.log("-----------------------------------------");
        console.log(`ÉXITO: Se detectaron ${allUsers.length} usuarios reales.`);
        console.log("-----------------------------------------");
        
        allUsers.forEach((u, i) => {
            console.log(`[${i + 1}] Email: ${u.email} | Status: ${u.subscriptionStatus}`);
        });
        
        console.log("-----------------------------------------");
        console.log("Verificación completada.");
        process.exit(0);
    } catch (error) {
        console.error("ERROR FATAL DE CONEXIÓN:", error);
        process.exit(1);
    }
}

verify();
