
import { pgTable, text, timestamp, uuid, boolean, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionStatus: text("subscription_status"), // active, trialing, etc.
  currentPeriodEnd: timestamp("current_period_end"),
  billingInterval: text("billing_interval"),
  plan: text("plan").default("Estandar"), // Free, Estandar, Multisede, Premium AI
  isAutoRenew: boolean("is_auto_renew").default(true),
  cicloDePago: text("ciclo_de_pago").default("mensual"), // mensual, semestral, anual
  sucursalesExtra: integer("sucursales_extra").default(0),
});

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  phone: text("phone"),
});

export const audit_logs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  accion: text("accion").notNull(),
  detalle: text("detalle").notNull(),
  responsable: text("responsable").notNull().default("Sistema"),
  monto: integer("monto").default(0),
  fecha: timestamp("fecha").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuditLog = typeof audit_logs.$inferSelect;
export type NewAuditLog = typeof audit_logs.$inferInsert;
