import { pgTable, text, timestamp, uuid, boolean, integer } from "drizzle-orm/pg-core";

// --- 1. USUARIOS ---
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionStatus: text("subscription_status"), 
  currentPeriodEnd: timestamp("current_period_end"),
  billingInterval: text("billing_interval"),
  plan: text("plan").default("Estandar"), 
  isAutoRenew: boolean("is_auto_renew").default(true),
  cicloDePago: text("ciclo_de_pago").default("mensual"), 
  sucursalesExtra: integer("sucursales_extra").default(0),
  telefono: text("telefono"), 
  lastSeen: timestamp("last_seen").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- 2. CONFIGURACIÓN ---
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  phone: text("phone"),
});

// --- 3. BOT SETTINGS ---
export const bot_settings = pgTable("bot_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  isEnabled: boolean("is_enabled").default(true),
  welcomeMessage: text("welcome_message"),
  reminderMessage: text("reminder_message"),
  trialEndedMessage: text("trial_ended_message"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- 4. AUDIT LOGS (Corregido para index.ts) ---
export const audit_logs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  fecha: timestamp("fecha").defaultNow(), // Mantenemos "fecha" porque index.ts la usa para ordenar
  accion: text("accion").notNull(),
  detalle: text("detalle").notNull(),
  responsable: text("responsable").notNull().default("Sistema"),
  monto: integer("monto").default(0),
});

// --- 5. SESIONES DE WHATSAPP ---
export const wa_sessions = pgTable("wa_sessions", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
});

// --- TIPOS ---
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuditLog = typeof audit_logs.$inferSelect;
export type NewAuditLog = typeof audit_logs.$inferInsert;