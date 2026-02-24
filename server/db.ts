const drizzleInstance = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV !== "production",
});

// Export moderno
export const db = drizzleInstance;

// Compatibilidad con versión anterior
export const getDb = (_connectionString?: string) => drizzleInstance;