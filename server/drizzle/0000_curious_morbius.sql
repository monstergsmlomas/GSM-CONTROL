CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fecha" timestamp DEFAULT now(),
	"accion" text NOT NULL,
	"detalle" text NOT NULL,
	"responsable" text DEFAULT 'Sistema' NOT NULL,
	"monto" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "bot_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"welcome_message" text,
	"reminder_message" text,
	"trial_ended_message" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"phone" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"trial_ends_at" timestamp,
	"subscription_status" text,
	"current_period_end" timestamp,
	"billing_interval" text,
	"plan" text DEFAULT 'Estandar',
	"is_auto_renew" boolean DEFAULT true,
	"ciclo_de_pago" text DEFAULT 'mensual',
	"sucursales_extra" integer DEFAULT 0,
	"telefono" text,
	"last_seen" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wa_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"data" text NOT NULL
);
