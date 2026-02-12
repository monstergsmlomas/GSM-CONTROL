
import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  plan: text("plan").default("Free"), // Free, Pro, Premium
  status: text("status").default("Activo"), // Activo, Inactivo, Pendiente
  appContext: text("app_context").default("GSM FIX"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
