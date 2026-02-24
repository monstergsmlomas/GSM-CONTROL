import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

/* ================================
   🔒 PROTECCIÓN GLOBAL DEL PROCESO
================================ */
process.on("uncaughtException", (err) => {
    console.error("💥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
    console.error("💥 UNHANDLED REJECTION:", reason);
});

import express from "express";
import cors from "cors";
import { getDb } from "./db.js";
import { users, audit_logs, settings, bot_settings } from "./schema.js";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { initWhatsApp, sendWhatsAppMessage } from "./bot.js";
import { startCronJobs } from "./cron.js";

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-db-url']
}));

app.use(express.json());

/* ================================
   🔒 RATE LIMIT SIMPLE (ANTI-FLOOD)
================================ */

const ipRequests = new Map<string, number[]>();
const emailRequests = new Map<string, number[]>();

const RATE_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_IP = 30;
const MAX_REQUESTS_PER_EMAIL = 10;

function isRateLimited(map: Map<string, number[]>, key: string, max: number) {
    const now = Date.now();
    const windowStart = now - RATE_WINDOW;

    const timestamps = map.get(key)?.filter(ts => ts > windowStart) || [];

    timestamps.push(now);
    map.set(key, timestamps);

    return timestamps.length > max;
}

// Limpieza automática cada 5 minutos
setInterval(() => {
    const now = Date.now();
    const windowStart = now - RATE_WINDOW;

    for (const [key, timestamps] of ipRequests) {
        const filtered = timestamps.filter(ts => ts > windowStart);
        if (filtered.length === 0) ipRequests.delete(key);
        else ipRequests.set(key, filtered);
    }

    for (const [key, timestamps] of emailRequests) {
        const filtered = timestamps.filter(ts => ts > windowStart);
        if (filtered.length === 0) emailRequests.delete(key);
        else emailRequests.set(key, filtered);
    }
}, 5 * 60 * 1000);

/* ================================
   ⚡ BUFFER DE PINGS
================================ */
const pingBuffer = new Set<string>();

setInterval(async () => {
    if (pingBuffer.size === 0) return;

    const emailsToUpdate = Array.from(pingBuffer);
    pingBuffer.clear();

    try {
        const db = getDb(process.env.DATABASE_URL!);
        await db.update(users)
            .set({ lastSeen: new Date() })
            .where(inArray(users.email, emailsToUpdate));
    } catch (error: any) {
        console.error("❌ [Ping System] Error:", error.message);
    }
}, 60000);

/* ================================
   🚀 API ROUTES
================================ */

app.get("/api/bot-settings", async (req, res) => {
    try {
        const db = getDb(process.env.DATABASE_URL!);
        const config = await db.select().from(bot_settings).limit(1);
        res.json(config[0] || { isEnabled: true, welcomeMessage: "" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/users/ping", async (req, res) => {
    try {

        const clientIp = req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
        const { email } = req.body;

        if (!email) return res.status(400).json({ success: false });

        if (isRateLimited(ipRequests, clientIp, MAX_REQUESTS_PER_IP)) {
            return res.status(429).json({ error: "Too many requests (IP)" });
        }

        if (isRateLimited(emailRequests, email, MAX_REQUESTS_PER_EMAIL)) {
            return res.status(429).json({ error: "Too many requests (email)" });
        }

        const db = getDb(process.env.DATABASE_URL!);
        const [existing] = await db.select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (!existing) {
            const trialExpiry = new Date();
            trialExpiry.setDate(trialExpiry.getDate() + 7);

            await db.insert(users).values({
                email,
                subscriptionStatus: 'trialing',
                plan: 'Free',
                trialEndsAt: trialExpiry,
                lastSeen: new Date(),
                updatedAt: new Date()
            });
        } else {
            pingBuffer.add(email);
        }

        res.json({ success: true });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/users", async (req, res) => {
    try {
        const db = getDb(process.env.DATABASE_URL!);

        const all = await db.select({ user: users, setting: settings })
            .from(users)
            .leftJoin(settings, sql`${users.id}::text = ${settings.userId}`)
            .orderBy(desc(users.updatedAt));

        res.json(
            all
                .map(({ user: u, setting: s }) =>
                    u
                        ? { ...u, nombre: u.email.split('@')[0], telefono: s?.phone || "" }
                        : null
                )
                .filter(Boolean)
        );
    } catch (error: any) {
        res.json([]);
    }
});

app.patch("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb(process.env.DATABASE_URL!);
        const { telefono, ...updateData } = req.body;

        await db.transaction(async (tx) => {

            await tx.update(users)
                .set({ ...updateData, updatedAt: new Date() })
                .where(eq(users.id, id));

            if (telefono !== undefined) {
                const [existing] = await tx.select()
                    .from(settings)
                    .where(eq(settings.userId, id));

                if (!existing) {
                    await tx.insert(settings).values({
                        userId: id,
                        phone: telefono
                    });

                    const [config] = await tx.select().from(bot_settings).limit(1);
                    const [user] = await tx.select()
                        .from(users)
                        .where(eq(users.id, id))
                        .limit(1);

                    if (config?.isEnabled && config?.welcomeMessage && user) {
                        const msg = config.welcomeMessage.replace(
                            /{nombre}/g,
                            user.email.split('@')[0]
                        );

                        await sendWhatsAppMessage(telefono, msg);
                    }
                } else {
                    await tx.update(settings)
                        .set({ phone: telefono })
                        .where(eq(settings.userId, id));
                }
            }
        });

        res.json({ success: true });

    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.get("/api/logs", async (req, res) => {
    try {
        const db = getDb(process.env.DATABASE_URL!);
        const result = await db.select()
            .from(audit_logs)
            .orderBy(desc(audit_logs.fecha))
            .limit(100);

        res.json(result);
    } catch (error) {
        res.json([]);
    }
});

/* ================================
   🌐 SERVIR FRONTEND
================================ */

app.use(express.static(path.join(process.cwd(), 'dist')));
app.get(/^(?!\/api).*/, (req, res) =>
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'))
);

/* ================================
   🚀 START SERVER
================================ */

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅ Servidor GSM-CONTROL en puerto ${PORT}`);

    initWhatsApp();

    if (process.env.RUN_CRON === "true") {
        startCronJobs();
    } else {
        console.log("⏸ Cron desactivado (RUN_CRON != true)");
    }
});