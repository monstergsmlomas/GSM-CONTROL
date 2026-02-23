import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Mantenemos el caché para no recrear el pool innecesariamente
const poolCache = new Map<string, pg.Pool>();

export const getDb = (connectionString?: string) => {
  const finalConnectionString = connectionString || process.env.DATABASE_URL;

  if (!finalConnectionString) {
    throw new Error("No database connection string provided. Check DATABASE_URL in .env");
  }

  if (!poolCache.has(finalConnectionString)) {
    const host = finalConnectionString.includes('@') 
      ? finalConnectionString.split('@')[1].split('/')[0] 
      : 'local/unknown';
    
    console.log(`[DB] Iniciando Pool de conexiones para: ${host}`);
    
    const pool = new Pool({
      connectionString: finalConnectionString,
      ssl: { rejectUnauthorized: false },
      // MEJORA: Ajuste de límites para Supabase Free/Basic
      max: 10,              // Máximo de conexiones simultáneas
      min: 2,               // Mantener al menos 2 conexiones listas para evitar latencia inicial
      idleTimeoutMillis: 10000, // Cerrar conexiones inactivas más rápido (10s) para liberar espacio
      connectionTimeoutMillis: 10000, // Dar más margen de conexión si la red está lenta
    });

    // Manejo de errores globales del pool
    pool.on('error', (err) => {
      console.error('❌ [DB Pool Error] Error inesperado en cliente inactivo:', err.message);
    });

    poolCache.set(finalConnectionString, pool);
  }

  const pool = poolCache.get(finalConnectionString)!;

  // MEJORA: Retornamos la instancia de Drizzle configurada con el schema
  // El logger: true te ayudará en desarrollo a ver qué consultas se hacen
  return drizzle(pool, { 
    schema, 
    logger: process.env.NODE_ENV !== 'production' 
  });
};