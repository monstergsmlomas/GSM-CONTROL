import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import { getDb } from "./db.js";
import { users, audit_logs, settings, bot_settings } from "./schema.js";
import { eq, desc, sql, gt, inArray } from "drizzle-orm";
import { initWhatsApp, sendWhatsAppMessage, getBotStatus } from "./bot.js";
import { startCronJobs } from "./cron.js";

const app = express();

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-db-url']
}));
app.use(express.json());

// --- ⚡ OPTIMIZACIÓN: BUFFER DE PINGS EN MEMORIA ---
const pingBuffer = new Set<string>();

setInterval(async () => {
    if (pingBuffer.size === 0) return;

    const emailsToUpdate = Array.from(pingBuffer);
    pingBuffer.clear();

    try {
        const db = getDb(process.env.DATABASE_URL!);
        console.log(`[Ping System] Actualizando lastSeen para ${emailsToUpdate.length} usuarios...`);
        
        await db.update(users)
            .set({ lastSeen: new Date() })
            .where(inArray(users.email, emailsToUpdate));
            
    } catch (error: any) {
        console.error("❌ [Ping System] Error en actualización masiva:", error.message);
    }
}, 60000);

// --- 1. ADMINISTRACIÓN Y REPORTES ---
app.get("/api/admin/force-report", async (req, res) => {
    try {
        console.log("🚀 [Admin] Disparando reporte semanal manualmente...");
        const { runWeeklyReport } = await import('./cron.js');
        await runWeeklyReport();
        res.json({ success: true, message: "Reporte enviado correctamente." });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- 2. CONFIGURACIÓN Y ESTADO DEL BOT ---
app.get("/api/bot-status", (req, res) => {
    res.json(getBotStatus());
});

app.get("/api/bot-settings", async (req, res) => {
    try {
        const db = getDb(process.env.DATABASE_URL!);
        const config = await db.select().from(bot_settings).limit(1);
        if (config.length > 0) res.json(config[0]);
        else res.json({ isEnabled: true, welcomeMessage: "", reminderMessage: "", trialEndedMessage: "" });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post("/api/bot-settings", async (req, res) => {
    try {
        const db = getDb(process.env.DATABASE_URL!);
        const body = req.body;
        await db.insert(bot_settings)
            .values({ ...body, updatedAt: new Date() })
            .onConflictDoUpdate({
                target: bot_settings.id,
                set: { ...body, updatedAt: new Date() }
            });
        res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: "Error al guardar configuración." }); }
});

// --- 3. USUARIOS Y CONTADOR DE ACTIVOS ---
app.get("/api/users/active-count", async (req, res) => {
    try {
        const db = getDb(process.env.DATABASE_URL!);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const result = await db.select({ count: sql<number>`count(*)` })
            .from(users)
            .where(gt(users.lastSeen, fiveMinutesAgo));
            
        res.json({ count: Math.max(Number(result[0].count), 1) });
    } catch (error) { res.json({ count: 1 }); }
});

app.post("/api/users/ping", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false });
    pingBuffer.add(email);
    res.json({ success: true, buffered: true });
});

// --- 4. GESTIÓN DE USUARIOS ---
app.get("/api/users", async (req, res) => {
    try {
        const db = getDb(process.env.DATABASE_URL!);
        const allWithSettings = await db.select({ user: users, setting: settings })
            .from(users)
            .leftJoin(settings, sql`${users.id}::text = ${settings.userId}`)
            .orderBy(desc(users.updatedAt));

        const mappedUsers = allWithSettings.map(({ user: u, setting: s }) => {
            if (!u) return null;
            return {
                id: u.id,
                email: u.email,
                nombre: u.email.split('@')[0], 
                fechaAlta: u.trialEndsAt ? new Date(u.trialEndsAt).toISOString() : new Date().toISOString(),
                trialEndsAt: u.trialEndsAt ? new Date(u.trialEndsAt).toISOString() : null,
                subscriptionStatus: String(u.subscriptionStatus || 'expired').toLowerCase(),
                plan: u.plan || 'Estandar',
                cicloDePago: u.cicloDePago || 'mensual',
                sucursalesExtra: Number(u.sucursalesExtra || 0),
                currentPeriodEnd: u.currentPeriodEnd ? new Date(u.currentPeriodEnd).toISOString() : null,
                updatedAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : null,
                telefono: s?.phone || ""
            };
        }).filter(Boolean);
        res.json(mappedUsers);
    } catch (error: any) { res.json([]); }
});

app.patch("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        let { subscriptionStatus, trialEndsAt, currentPeriodEnd, telefono, plan, ciclo_de_pago, sucursales_extra } = req.body;
        const db = getDb(process.env.DATABASE_URL!);

        if (plan && plan !== 'Free') trialEndsAt = null;

        const updateData: any = { updatedAt: new Date() };
        if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus;
        updateData.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
        updateData.currentPeriodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
        if (plan) updateData.plan = plan;
        if (ciclo_de_pago) updateData.cicloDePago = ciclo_de_pago;
        if (sucursales_extra !== undefined) updateData.sucursalesExtra = sucursales_extra;

        await db.update(users).set(updateData).where(eq(users.id, id));

        if (telefono !== undefined) {
             const [existing] = await db.select().from(settings).where(eq(settings.userId, id));
             if (existing) await db.update(settings).set({ phone: telefono }).where(eq(settings.userId, id));
             else await db.insert(settings).values({ userId: id, phone: telefono });
        }
        res.json({ success: true });
    } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// --- 5. LOGS Y MÉTRICAS ---
app.get("/api/logs", async (req, res) => {
    try {
        const db = getDb(process.env.DATABASE_URL!);
        const logs = await db.select().from(audit_logs).orderBy(desc(audit_logs.fecha)).limit(100);
        res.json(logs);
    } catch (error) { res.json([]); }
});

app.get("/api/metrics", async (req, res) => {
    try {
        const db = getDb(process.env.DATABASE_URL!);
        const all = await db.select().from(users);
        res.json({
            total: all.length,
            active: all.filter((u: any) => u.subscriptionStatus === 'active').length,
            trialing: all.filter((u: any) => u.subscriptionStatus === 'trialing').length
        });
    } catch (error) { res.json({ total: 0, active: 0, trialing: 0 }); }
});

app.use(express.static(path.join(process.cwd(), 'dist')));
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅ Servidor GSM-CONTROL en puerto ${PORT}`);
    initWhatsApp();
    startCronJobs();
});