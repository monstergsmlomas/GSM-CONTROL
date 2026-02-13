
import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionStatus: text("subscription_status"), // active, trialing, etc.
  currentPeriodEnd: timestamp("current_period_end"),
  billingInterval: text("billing_interval"),
  plan: text("plan").default("Estandar"), // Free, Estandar, Multisede, Premium AI
  isAutoRenew: boolean("is_auto_renew").default(true),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
