import { pgTable, serial, text, timestamp, decimal, pgEnum } from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('status', ['active', 'trial', 'expired', 'suspended']);

export const subscriptions = pgTable('subscriptions', {
    id: serial('id').primaryKey(),
    user_uid: text('user_uid').unique().notNull(), // references the workshop owner
    status: statusEnum('status').default('trial').notNull(),
    plan_type: text('plan_type').notNull(), // 'monthly', 'yearly'
    expires_at: timestamp('expires_at').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
});

export const licensePayments = pgTable('license_payments', {
    id: serial('id').primaryKey(),
    user_uid: text('user_uid').notNull(),
    amount: decimal('amount').notNull(),
    payment_method: text('payment_method').notNull(), // 'MercadoPago', 'Bank Transfer'
    external_reference: text('external_reference'), // for MP IDs
    status: text('status').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
});
