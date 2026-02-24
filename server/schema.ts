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

// --- 2. CONFIGURACIÓN (RECUPERADA PARA GSM-FIX) ---
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  shop_name: text("shop_name"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  whatsapp: text("whatsapp"),
  landline: text("landline"),
  logo_url: text("logo_url"),
  receipt_disclaimer: text("receipt_disclaimer"),
  card_surcharge: integer("card_surcharge"),
  transfer_surcharge: integer("transfer_surcharge"),
  ticket_footer: text("ticket_footer"),
  checklist_options: text("checklist_options"),
  print_format: text("print_format"),
  day_cutoff_hour: integer("day_cutoff_hour"),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// --- 4. AUDIT LOGS ---
export const audit_logs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  fecha: timestamp("fecha").defaultNow(), 
  accion: text("accion").notNull(),
  detalle: text("detalle").notNull(),
  responsable: text("responsable").notNull().default("Sistema"),
  monto: integer("monto").default(0),
});

// --- 5. TABLAS DE NEGOCIO (PROTECCIÓN ANTI-BORRADO) ---
// Estas definiciones evitan que Drizzle borre tus datos de GSM-FIX en Supabase
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
});

export const repair_orders = pgTable("repair_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id"),
  status: text("status"),
});

export const daily_cash = pgTable("daily_cash", {
  id: uuid("id").primaryKey().defaultRandom(),
});

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
});

// --- TIPOS ---
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuditLog = typeof audit_logs.$inferSelect;
export type NewAuditLog = typeof audit_logs.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type BotSetting = typeof bot_settings.$inferSelect;