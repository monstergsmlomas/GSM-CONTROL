import { getDb } from "./db.js";
import { wa_sessions } from "./schema.js";

async function reset() {
    try {
        const db = getDb();
        console.log("⏳ Conectando a la base de datos...");
        await db.delete(wa_sessions);
        console.log("✅ ÉXITO: Tabla wa_sessions vaciada por completo.");
        process.exit(0);
    } catch (error) {
        console.error("❌ ERROR al limpiar:", error.message);
        process.exit(1);
    }
}
reset();