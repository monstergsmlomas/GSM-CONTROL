
import { pgTable, text, serial, timestamp, uuid, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ENUMS
export const planEnum = pgEnum("plan", ["free", "pro", "premium"]);
export const repairStatusEnum = pgEnum("repair_status", ["received", "repairing", "finished", "delivered"]);

// TABLAS
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const apps = pgTable("apps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  appId: integer("app_id").references(() => apps.id),
  plan: planEnum("plan").default("free"),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
});

export const repairs = pgTable("repairs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  customerName: text("customer_name").notNull(),
  deviceModel: text("device_model").notNull(),
  status: repairStatusEnum("status").default("received"),
  cost: integer("cost").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// RELACIONES
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  repairs: many(repairs),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  app: one(apps, {
    fields: [subscriptions.appId],
    references: [apps.id],
  }),
}));

export const repairsRelations = relations(repairs, ({ one }) => ({
  user: one(users, {
    fields: [repairs.userId],
    references: [users.id],
  }),
}));

// ESQUEMAS DE VALIDACIÓN
export const insertUserSchema = createInsertSchema(users).extend({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions, {
    expiresAt: z.coerce.date(),
});

export const insertAppSchema = createInsertSchema(apps);
export const insertRepairSchema = createInsertSchema(repairs);

// TYPES
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Repair = typeof repairs.$inferSelect;
export type NewRepair = typeof repairs.$inferInsert;