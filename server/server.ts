// Esto vive en tu servidor de GSM CONTROL
import { getDb } from "./db.js"; // <-- ACÁ ESTÁ LA MAGIA
import { users } from "./schema.js"; // <-- ACÁ TAMBIÉN
import { count } from "drizzle-orm";

const db = getDb(); 

async function obtenerEstadisticas() {
  const resultado = await db.select({ total: count() }).from(users);
  return resultado[0].total; 
}