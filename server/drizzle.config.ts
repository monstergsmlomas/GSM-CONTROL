import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Buscamos el .env que está una carpeta arriba
dotenv.config({ path: "../.env" });

export default defineConfig({
  schema: "./schema.ts", // <-- Cambiado a punto barra porque ya estamos en server
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
});