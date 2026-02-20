// Esto vive en tu servidor de GSM CONTROL
import { getDb } from "./db"; 
import { users } from "./schema"; 
import { count } from "drizzle-orm";

const db = getDb(); 

async function obtenerEstadisticas() {
  const resultado = await db.select({ total: count() }).from(users);
  return resultado[0].total; 
}
