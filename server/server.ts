// Esto vive en tu servidor de GSM CONTROL
import { db } from "./db"; // La conexión que configuramos antes
import { users } from "./db/schema"; // El mapa de tablas
import { count } from "drizzle-orm";

// Imagina que esto es un botón que, cuando lo tocas, 
// va a la base de datos y cuenta cuántos usuarios hay.
async function obtenerEstadisticas() {
  const resultado = await db.select({ total: count() }).from(users);
  return resultado[0].total; 
}