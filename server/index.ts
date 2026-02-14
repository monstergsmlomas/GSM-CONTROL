
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import { getDb } from "./db";
import { users, audit_logs, settings } from "./schema";
import { eq, desc, sql } from "drizzle-orm";

const app = express();

app.use(cors({
    origin: '*', // Allow all for Railway diagnostic phase
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-db-url']
}));
app.use(express.json());

// Middlewares
app.use((req, res, next) => {
    // Skip for non-api routes
    if (!req.path.startsWith('/api')) return next();
    next();
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
        
        const logs = await db.select()
            .from(audit_logs)
            .orderBy(desc(audit_logs.fecha));
        
        return res.json(logs);
    } catch (error: any) {
        console.error("Non-fatal error fetching logs (Returning []):", error.message);
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
        console.error("Error creating audit log (Controlled error):", error.message);
        res.status(200).json({ success: false, error: "Logging failed but action proceeded" });
    }
});

// GET /api/metrics
app.get("/api/metrics", async (req, res) => {
    try {
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);
        
        const allUsers = await db.select().from(users);
        let logs: any[] = [];
        try {
            logs = await db.select()
                .from(audit_logs)
                .orderBy(desc(audit_logs.fecha))
                .limit(5);
        } catch (e) {
            console.error("Non-fatal error fetching metrics logs:", e);
        }
        
        const total = allUsers.length;
        const active = allUsers.filter(u => u.subscriptionStatus === 'active').length;
        const trialing = allUsers.filter(u => u.subscriptionStatus === 'trialing').length;
        
        res.json({
            total,
            active,
            trialing,
            lastFive: logs
        });
    } catch (error: any) {
        console.error("Error fetching metrics (Returning defaults):", error.message);
        res.json({
            total: 0,
            active: 0,
            trialing: 0,
            lastFive: []
        });
    }
});

// GET /api/users
app.get("/api/users", async (req, res) => {
    try {
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);
        console.log(`[DEBUG] Attempting to fetch users from: ${dbUrl.substring(0, 20)}...`);
        let allWithSettings;
        try {
            allWithSettings = await db.select({
                user: users,
                setting: settings
            })
            .from(users)
            .leftJoin(settings, sql`${users.id}::text = ${settings.userId}`);
            
            console.log(`[DEBUG] Database returned ${allWithSettings.length} rows from users JOIN settings.`);
        } catch (joinError: any) {
            console.error("⚠️ Error joining with settings, falling back to basic users fetch:", joinError.message);
            try {
                const basicUsers = await db.select().from(users);
                allWithSettings = basicUsers.map(u => ({ user: u, setting: null }));
            } catch (usersError: any) {
                console.error("❌ Fatal database error (returning []):", usersError.message);
                return res.json([]);
            }
        }

        console.log(`Found ${allWithSettings.length} users (robust mode).`);
        
        const mappedUsers = allWithSettings.map(({ user: u, setting: s }) => {
            try {
                if (!u) return null;
                
                // Fallback email split safely
                const emailStr = u.email || "";
                const nombreBase = emailStr ? emailStr.split('@')[0] : 'Usuario';

                const planRaw = (u.plan || 'Estandar').toLowerCase();
                let planMapped = 'Estandar';
                if (planRaw.includes('premium')) planMapped = 'Premium AI';
                else if (planRaw.includes('multi')) planMapped = 'Multisede';
                else if (planRaw.includes('free')) planMapped = 'Free';
                else if (planRaw.includes('estandar')) planMapped = 'Estandar';

                return {
                    id: u.id,
                    email: emailStr,
                    nombre: nombreBase, 
                    fechaAlta: u.trialEndsAt ? new Date(u.trialEndsAt).toISOString() : new Date().toISOString(),
                    trialEndsAt: u.trialEndsAt ? new Date(u.trialEndsAt).toISOString() : null,
                    subscriptionStatus: (u.subscriptionStatus || 'expired').toLowerCase() as 'active' | 'trialing' | 'expired',
                    plan: planMapped as any,
                    cicloDePago: (u.cicloDePago || 'mensual') as any,
                    sucursalesExtra: u.sucursalesExtra || 0,
                    currentPeriodEnd: u.currentPeriodEnd ? new Date(u.currentPeriodEnd).toISOString() : null,
                    telefono: s?.phone || "" // Garantizar string vacío si es nulo
                };
            } catch (err) {
                console.error("Error mapping individual user row:", err);
                return null;
            }
        }).filter(Boolean);

        res.json(mappedUsers);
    } catch (error: any) {
        console.error("ULTRA-FAIL in GET /api/users (Returning []):", error.message);
        res.json([]);
    }
});

// PATCH /api/users/:id
app.patch("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { subscriptionStatus, trialEndsAt, responsable, ciclo_de_pago, sucursales_extra, currentPeriodEnd, telefono, plan } = req.body;
        
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);

        const updateData: any = {};
        let logDetail = "Se modificaron datos del usuario.";
        
        if (subscriptionStatus) {
            updateData.subscriptionStatus = subscriptionStatus;
            logDetail = `Se modificó el estado a ${subscriptionStatus} para el ID ${id}`;
        }

        if (trialEndsAt) {
            const translatedDate = new Date(trialEndsAt);
            updateData.trialEndsAt = translatedDate;
            logDetail += ` y trial a ${trialEndsAt}`;
            
            const now = new Date();
            if (translatedDate > now && (!subscriptionStatus || subscriptionStatus === 'expired')) {
                updateData.subscriptionStatus = 'trialing';
            }
        }

        if (ciclo_de_pago) updateData.cicloDePago = ciclo_de_pago;
        if (sucursales_extra !== undefined) updateData.sucursalesExtra = sucursales_extra;
        if (currentPeriodEnd) updateData.currentPeriodEnd = new Date(currentPeriodEnd);
        if (plan) updateData.plan = plan;

        await db.update(users)
            .set(updateData)
            .where(eq(users.id, id));

        // Secundary update for settings (phone)
        if (telefono !== undefined) {
             const [existingSettings] = await db.select().from(settings).where(eq(settings.userId, id));
             if (existingSettings) {
                 await db.update(settings).set({ phone: telefono }).where(eq(settings.userId, id));
             } else {
                 await db.insert(settings).values({ userId: id, phone: telefono });
             }
        }

        // Insert Audit Log - Wrapped in try-catch to prevent main flow crash
        try {
            await db.insert(audit_logs).values({
                accion: 'Actualización de Cliente',
                detalle: `Cambio de estado a ${subscriptionStatus || 'N/A'}`,
                responsable: responsable || "Sistema",
                monto: 0,
                fecha: new Date()
            });
        } catch (e) {
            console.error("Failed to log audit action:", e);
        }

        // Fetch updated user with settings
        const results = await db.select({
            user: users,
            setting: settings
        })
        .from(users)
        .leftJoin(settings, sql`${users.id}::text = ${settings.userId}`)
        .where(eq(users.id, id));

        if (results.length === 0) {
            return res.status(404).json({ error: "User not found after update" });
        }

        const { user: u, setting: s } = results[0];
        
        if (!u) {
            return res.status(404).json({ error: "User data is missing" });
        }
        
        const planRaw = (u.plan || 'Estandar').toLowerCase();
        let planMapped = 'Estandar';
        if (planRaw.includes('premium')) planMapped = 'Premium AI';
        else if (planRaw.includes('multi')) planMapped = 'Multisede';
        else if (planRaw.includes('free')) planMapped = 'Free';
        else if (planRaw.includes('estandar')) planMapped = 'Estandar';

        const mappedUser = {
            id: u.id,
            email: u.email,
            nombre: u.email.split('@')[0], 
            fechaAlta: u.trialEndsAt ? new Date(u.trialEndsAt).toISOString() : new Date().toISOString(),
            trialEndsAt: u.trialEndsAt ? new Date(u.trialEndsAt).toISOString() : null,
            subscriptionStatus: (u.subscriptionStatus || 'expired').toLowerCase() as 'active' | 'trialing' | 'expired',
            plan: planMapped as any,
            cicloDePago: (u.cicloDePago || 'mensual') as any,
            sucursalesExtra: u.sucursalesExtra || 0,
            currentPeriodEnd: u.currentPeriodEnd ? new Date(u.currentPeriodEnd).toISOString() : null,
            telefono: s?.phone || ""
        };

        res.json(mappedUser);
    } catch (error: any) {
        console.error("Error updating user (Controlled error):", error.message);
        res.status(400).json({ error: "No se pudo actualizar el usuario", details: error.message });
    }
});

// DELETE /api/users/:id
app.delete("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { responsable } = req.body;
        
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);

        // Audit before deletion
        await db.insert(audit_logs).values({
            accion: 'Eliminación de Cliente',
            detalle: `Se eliminó permanentemente al usuario con ID ${id}`,
            responsable: responsable || "Sistema",
            monto: 0,
            fecha: new Date()
        });

        await db.delete(users).where(eq(users.id, id));

        res.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting user (Controlled error):", error.message);
        res.status(400).json({ error: "No se pudo eliminar el usuario" });
    }
});

// GET /api/check-db (Visual Diagnostic)
app.get("/api/check-db", async (req, res) => {
    try {
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);
        
        const allUsers = await db.select().from(users);
        const allSettings = await db.select().from(settings);
        let allLogs = [];
        try { allLogs = await db.select().from(audit_logs); } catch (e) { console.log("audit_logs missing"); }
        
        res.json({
            status: "Conectado",
            db_prefix: dbUrl.split('@')[1]?.substring(0, 15),
            counts: {
                users: allUsers.length,
                settings: allSettings.length,
                audit_logs: allLogs.length
            },
            sample_user: allUsers[0]?.email || "Ninguno",
            database_url_active: true
        });
    } catch (error: any) {
        console.error("Error in check-db:", error);
        res.status(500).json({ 
            status: "Error", 
            message: error.message,
            database_url_active: !!process.env.DATABASE_URL 
        });
    }
});

// GET /api/debug-tables
app.get("/api/debug-tables", async (req, res) => {
    try {
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) return res.status(400).json({ error: "No DB URL" });
        const db = getDb(dbUrl);
        
        const tables = ['users', 'settings', 'audit_logs'];
        const results: any = {};
        
        for (const table of tables) {
            try {
                const query = await db.execute(sql.raw(`SELECT count(*) as count FROM ${table}`));
                results[table] = query.rows[0];
            } catch (e: any) {
                results[table] = { error: e.message };
            }
        }
        
        res.json({ results, env_db: !!process.env.DATABASE_URL });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Servir estáticos (Carpeta dist)
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// 3. LA SOLUCIÓN DEFINITIVA PARA EXPRESS 5:
// Usamos una expresión regular que captura absolutamente todo (.*)
app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// 4. Encendido del motor
const PORT = Number(process.env.PORT) || 5000;
console.log(`🚀 Intentando arrancar servidor en puerto ${PORT}...`);

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅ Servidor en línea en puerto ${PORT} (0.0.0.0)`);
    
    // Diagnóstico de arranque profundo (NON-BLOCKING)
    console.log("🔍 [Arranque] Iniciando diagnóstico de base de datos...");
    
    const dbDiscovery = async () => {
        try {
            const dbUrl = process.env.DATABASE_URL;
            if (dbUrl) {
                const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
                console.log(`🔗 [Arranque] DATABASE_URL detectada: ${maskedUrl}`);
                
                const db = getDb(dbUrl);
                
                try {
                    const dbNameRes = await db.execute(sql.raw(`SELECT current_database()`));
                    console.log(`📡 [Arranque] Conectado a la base de datos: ${dbNameRes.rows[0].current_database}`);
                } catch (e) { console.log("⚠️ [Arranque] No se pudo obtener el nombre de la DB."); }

                console.log("📂 [Arranque] Verificando inventario de tablas en 'public'...");
                try {
                    const tablesListRes = await db.execute(sql.raw(`
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public'
                    `));
                    const tableNames = tablesListRes.rows.map((r: any) => r.table_name);
                    console.log(`📑 [Arranque] Tablas encontradas: ${tableNames.join(", ") || "NINGUNA"}`);
                    
                    if (tableNames.includes('users')) {
                        const uCount = await db.execute(sql.raw(`SELECT count(*) as count FROM users`));
                        console.log(`📊 [Arranque] Conteo en 'users': ${uCount.rows[0].count}`);
                    }
                } catch (e: any) { console.log("❌ [Arranque] Falló el listado de tablas:", e.message); }

            } else {
                console.log("⚠️ [Arranque] No se encontró DATABASE_URL en el entorno.");
            }
        } catch (e: any) {
            console.error("❌ [Arranque] Error en diagnóstico (No crítico):", e.message);
        }
    };

    // Run discovery without blocking the main event loop
    dbDiscovery();
});
