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
import { eq, desc, sql } from "drizzle-orm";
import { initWhatsApp, sendWhatsAppMessage } from "./bot.js";
import { startCronJobs } from "./cron.js";

const app = express();

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-db-url']
}));
app.use(express.json());

// Middlewares
app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) return next();
    next();
});

// --- NUEVA RUTA: DISPARAR REPORTE SEMANAL MANUALMENTE ---
app.get("/api/admin/force-report", async (req, res) => {
    try {
        console.log("🚀 [Admin] Disparando reporte semanal manualmente...");
        const { runWeeklyReport } = await import('./cron.js');
        await runWeeklyReport();
        res.json({ 
            success: true, 
            message: "Reporte enviado correctamente a Rodrigo y Tomy." 
        });
    } catch (error: any) {
        console.error("❌ Error en force-report:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/health
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
});

// GET /api/logs
app.get("/api/logs", async (req, res) => {
    try {
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) return res.json([]);
        const db = getDb(dbUrl);
        const logs = await db.select().from(audit_logs).orderBy(desc(audit_logs.fecha));
        return res.json(logs);
    } catch (error: any) {
        console.error("Non-fatal error fetching logs:", error.message);
        return res.json([]);
    }
});

// POST /api/logs
app.post("/api/logs", async (req, res) => {
    try {
        const { accion, responsable, detalle, monto } = req.body;
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);
        await db.insert(audit_logs).values({
            accion,
            responsable: responsable || "Sistema",
            detalle,
            monto: monto || 0,
            fecha: new Date()
        });
        res.status(201).json({ success: true });
    } catch (error: any) {
        res.status(200).json({ success: false, error: "Logging failed" });
    }
});

// GET /api/metrics
app.get("/api/metrics", async (req, res) => {
    try {
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);
        let allUsers;
        try {
            allUsers = await db.select().from(users);
        } catch (e) {
            const rawRes = await db.execute(sql.raw(`SELECT * FROM public.users`));
            allUsers = rawRes.rows;
        }
        const total = allUsers.length;
        const active = allUsers.filter((u: any) => u.subscriptionStatus === 'active' || u.subscription_status === 'active').length;
        const trialing = allUsers.filter((u: any) => u.subscriptionStatus === 'trialing' || u.subscription_status === 'trialing').length;
        res.json({ total, active, trialing });
    } catch (error: any) {
        res.json({ total: 0, active: 0, trialing: 0 });
    }
});

// GET /api/users
app.get("/api/users", async (req, res) => {
    try {
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);
        const allWithSettings = await db.select({
            user: users,
            setting: settings
        })
        .from(users)
        .leftJoin(settings, sql`${users.id}::text = ${settings.userId}`)
        .orderBy(desc(users.updatedAt));

        const mappedUsers = allWithSettings.map(({ user: u, setting: s }) => {
            if (!u) return null;
            const planRaw = (u.plan || 'Estandar').toLowerCase();
            let planMapped = 'Estandar';
            if (planRaw.includes('premium')) planMapped = 'Premium AI';
            else if (planRaw.includes('multi')) planMapped = 'Multisede';
            else if (planRaw.includes('free')) planMapped = 'Free';

            return {
                id: u.id,
                email: u.email,
                nombre: u.email.split('@')[0], 
                fechaAlta: u.trialEndsAt ? new Date(u.trialEndsAt).toISOString() : new Date().toISOString(),
                trialEndsAt: u.trialEndsAt ? new Date(u.trialEndsAt).toISOString() : null,
                subscriptionStatus: String(u.subscriptionStatus || 'expired').toLowerCase(),
                plan: planMapped,
                cicloDePago: u.cicloDePago || 'mensual',
                sucursalesExtra: Number(u.sucursalesExtra || 0),
                currentPeriodEnd: u.currentPeriodEnd ? new Date(u.currentPeriodEnd).toISOString() : null,
                updatedAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : null,
                telefono: s?.phone || ""
            };
        }).filter(Boolean);
        res.json(mappedUsers);
    } catch (error: any) {
        res.json([]);
    }
});

// PATCH /api/users/:id
app.patch("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        let { subscriptionStatus, trialEndsAt, responsable, ciclo_de_pago, sucursales_extra, currentPeriodEnd, telefono, plan } = req.body;
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        const db = getDb(dbUrl);

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // --- 🚀 NUEVO: LÓGICA INTELIGENTE DE CAMBIO A PLAN PAGO ---
        // Si el usuario pasa a un plan pago, lo ponemos "Activo" y NO tiene fecha de suscripción cargada a mano:
        if (plan !== 'Free' && subscriptionStatus === 'active' && !currentPeriodEnd) {
            const nuevaFecha = new Date();
            
            // Le calculamos el tiempo automáticamente según el ciclo de pago
            if (ciclo_de_pago === 'anual') {
                nuevaFecha.setFullYear(nuevaFecha.getFullYear() + 1);
            } else if (ciclo_de_pago === 'semestral') {
                nuevaFecha.setMonth(nuevaFecha.getMonth() + 6);
            } else {
                nuevaFecha.setMonth(nuevaFecha.getMonth() + 1); // Mensual por defecto
            }
            
            currentPeriodEnd = nuevaFecha.toISOString();
            trialEndsAt = null; // Limpiamos el trial viejo para que no joda más
            console.log(`✅ Upgrade detectado para usuario ${id}: Nueva fecha de corte -> ${currentPeriodEnd}`);
        }

        // --- LÓGICA DE AUTO-EXPIRACIÓN ---
        let dateToCheck = null;
        if (plan === 'Free' || subscriptionStatus === 'trialing') {
            dateToCheck = trialEndsAt;
        } else {
            dateToCheck = currentPeriodEnd || trialEndsAt;
        }

        if (dateToCheck && (subscriptionStatus === 'active' || subscriptionStatus === 'trialing')) {
            const limitDate = new Date(dateToCheck);
            limitDate.setHours(0, 0, 0, 0);
            if (limitDate < now) {
                console.log(`⚠️ Auto-expirando usuario ${id} por fecha vencida al guardar.`);
                subscriptionStatus = 'expired';
            }
        }
        // ---------------------------------

        const updateData: any = { updatedAt: new Date() };
        
        if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus;
        
        // Guardamos las fechas (si trialEndsAt es null, lo va a vaciar en la DB)
        updateData.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
        updateData.currentPeriodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
        
        if (ciclo_de_pago) updateData.cicloDePago = ciclo_de_pago;
        if (sucursales_extra !== undefined) updateData.sucursalesExtra = sucursales_extra;
        if (plan) updateData.plan = plan;

        await db.update(users).set(updateData).where(eq(users.id, id));

        if (telefono !== undefined) {
             const [existing] = await db.select().from(settings).where(eq(settings.userId, id));
             if (existing) await db.update(settings).set({ phone: telefono }).where(eq(settings.userId, id));
             else await db.insert(settings).values({ userId: id, phone: telefono });
        }
        res.json({ success: true, newStatus: subscriptionStatus });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/users/:id
app.delete("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        const db = getDb(dbUrl);
        await db.delete(users).where(eq(users.id, id));
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// PING / Last Seen
app.post("/api/users/ping", async (req, res) => {
    try {
        const db = getDb(process.env.DATABASE_URL!);
        const { email } = req.body;
        await db.update(users).set({ lastSeen: new Date() }).where(eq(users.email, email));
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Statics & Frontend Routing
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// Start engine
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅ Servidor GSM-CONTROL en puerto ${PORT}`);
    initWhatsApp();
    startCronJobs();
});