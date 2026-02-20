import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import { getDb } from "./db";
import { users, audit_logs, settings, bot_settings } from "./schema";
import { eq, desc, sql } from "drizzle-orm";
import { initWhatsApp, sendWhatsAppMessage } from "./bot";
import { startCronJobs } from "./cron";

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
        
        let allUsers;
        try {
            allUsers = await db.select().from(users);
        } catch (e) {
            console.log("⚠️ Fallback: Querying 'public.users' for metrics...");
            const rawRes = await db.execute(sql.raw(`SELECT * FROM public.users`));
            allUsers = rawRes.rows;
        }

        let logs: any[] = [];
        try {
            logs = await db.select()
                .from(audit_logs)
                .orderBy(desc(audit_logs.fecha))
                .limit(5);
        } catch (e) {
            try {
                const rawLogs = await db.execute(sql.raw(`SELECT * FROM public.audit_logs ORDER BY fecha DESC LIMIT 5`));
                logs = rawLogs.rows;
            } catch (le) {
                console.error("Non-fatal error fetching metrics logs:", le);
            }
        }
        
        const total = allUsers.length;
        const active = allUsers.filter((u: any) => u.subscription_status === 'active' || u.subscriptionStatus === 'active').length;
        const trialing = allUsers.filter((u: any) => u.subscription_status === 'trialing' || u.subscriptionStatus === 'trialing').length;
        
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
        console.log(`[DEBUG] Fetching users. Using Service Role Secret presence: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
        
        let allWithSettings;
        try {
            // Intento 1: Drizzle Query Estándar
            allWithSettings = await db.select({
                user: users,
                setting: settings
            })
            .from(users)
            .leftJoin(settings, sql`${users.id}::text = ${settings.userId}`)
            .orderBy(desc(users.updatedAt));
        } catch (joinError: any) {
            console.warn("⚠️ Error en query estándar, intentando fallback de esquema explícito...");
            try {
                // Intento 2: Raw SQL con esquema explícito public para saltar search_path roto
                const rawUsers = await db.execute(sql.raw(`
                    SELECT u.*, s.phone as "setting_phone"
                    FROM public.users u
                    LEFT JOIN public.settings s ON u.id::text = s.user_id
                    ORDER BY u.updated_at DESC NULLS LAST
                `));
                allWithSettings = rawUsers.rows.map((r: any) => ({
                    user: r,
                    setting: { phone: r.setting_phone }
                }));
            } catch (fallbackError: any) {
                console.error("❌ Todos los intentos de lectura de usuarios fallaron:", fallbackError.message);
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

                // TRUCO CLAVE: Leer tanto camelCase (Drizzle) como snake_case (Raw SQL de Supabase)
                const rawTrialEndsAt = u.trialEndsAt || u.trial_ends_at;
                const rawSubscriptionStatus = u.subscriptionStatus || u.subscription_status || 'expired';
                const rawCicloDePago = u.cicloDePago || u.ciclo_de_pago || 'mensual';
                const rawSucursalesExtra = u.sucursalesExtra !== undefined ? u.sucursalesExtra : (u.sucursales_extra || 0);
                const rawCurrentPeriodEnd = u.currentPeriodEnd || u.current_period_end;

                return {
                    id: u.id,
                    email: emailStr,
                    nombre: nombreBase, 
                    fechaAlta: rawTrialEndsAt ? new Date(rawTrialEndsAt).toISOString() : new Date().toISOString(),
                    trialEndsAt: rawTrialEndsAt ? new Date(rawTrialEndsAt).toISOString() : null,
                    subscriptionStatus: String(rawSubscriptionStatus).toLowerCase() as 'active' | 'trialing' | 'expired',
                    plan: planMapped as any,
                    cicloDePago: String(rawCicloDePago) as any,
                    sucursalesExtra: Number(rawSucursalesExtra),
                    currentPeriodEnd: rawCurrentPeriodEnd ? new Date(rawCurrentPeriodEnd).toISOString() : null,
                    updatedAt: (u.updatedAt || u.updated_at) ? new Date(u.updatedAt || u.updated_at).toISOString() : null,
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
        
        console.log(`[PATCH DEBUG] ID: ${id}`);
        console.log(`[PATCH DEBUG] Payload:`, JSON.stringify(req.body, null, 2));

        let logDetail = "Se modificaron datos del usuario.";
        const now = new Date();
        
        // --- INICIO DE LA LÓGICA INTELIGENTE ---
        if (subscriptionStatus === 'expired') {
            // 1. Si apretás "Expirado" a mano: Fuerza la etiqueta y CADUCA la fecha al instante (le pone fecha de ayer).
            updateData.subscriptionStatus = 'expired';
            updateData.trialEndsAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24hs en el pasado
            logDetail = `Se forzó estado Expirado y se caducó el trial para el ID ${id}`;
        } else {
            // 2. Si elegís Activo o Prueba
            if (subscriptionStatus) {
                updateData.subscriptionStatus = subscriptionStatus;
                logDetail = `Se modificó el estado a ${subscriptionStatus} para el ID ${id}`;
            }
            
            // 3. Lógica de fechas
            if (trialEndsAt) {
                const translatedDate = new Date(trialEndsAt);
                updateData.trialEndsAt = translatedDate;
                logDetail += ` y trial a ${trialEndsAt}`;
                
                // Si pones una fecha vieja a mano, se auto-expira
                if (translatedDate < now) {
                    updateData.subscriptionStatus = 'expired';
                } else if (!subscriptionStatus) {
                    // Si la fecha es futura y no forzaron estado, vuelve a trialing
                    updateData.subscriptionStatus = 'trialing';
                }
            }
        }
        // --- FIN DE LA LÓGICA INTELIGENTE ---

        if (ciclo_de_pago) updateData.cicloDePago = ciclo_de_pago;
        if (sucursales_extra !== undefined) updateData.sucursalesExtra = sucursales_extra;
        if (currentPeriodEnd) updateData.currentPeriodEnd = new Date(currentPeriodEnd);
        if (plan) updateData.plan = plan;

        console.log(`[PATCH DEBUG] Final updateData:`, JSON.stringify(updateData, null, 2));

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
                detalle: logDetail,
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

// POST /api/users/ping - Actualizar "Last Seen"
app.post("/api/users/ping", async (req, res) => {
    try {
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);

        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required" });

        await db.update(users)
            .set({ lastSeen: new Date() })
            .where(eq(users.email, email));

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/users/active-count - Obtener cantidad de usuarios activos (últimos 5 min)
app.get("/api/users/active-count", async (req, res) => {
    try {
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);

        // Hace 5 minutos
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const result = await db.execute(sql`
            SELECT count(*) as count 
            FROM ${users} 
            WHERE ${users.lastSeen} > ${fiveMinutesAgo}
        `);

        const count = parseInt(result.rows[0].count as string) || 0;
        res.json({ count });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/bot-settings
app.get("/api/bot-settings", async (req, res) => {
    try {
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);
        
        const settingsRes = await db.select().from(bot_settings).limit(1);
        if (settingsRes.length === 0) {
            return res.json({
                is_enabled: true,
                welcome_message: "",
                reminder_message: "",
                trial_ended_message: ""
            });
        }
        
        const s = settingsRes[0];
        res.json({
            is_enabled: s.isEnabled,
            welcome_message: s.welcomeMessage,
            reminder_message: s.reminderMessage,
            trial_ended_message: s.trialEndedMessage
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/bot-settings
app.post("/api/bot-settings", async (req, res) => {
    try {
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);
        
        const { is_enabled, welcome_message, reminder_message, trial_ended_message } = req.body;
        
        const existing = await db.select().from(bot_settings).limit(1);
        
        const data = {
            isEnabled: is_enabled,
            welcomeMessage: welcome_message,
            reminderMessage: reminder_message,
            trialEndedMessage: trial_ended_message,
            updatedAt: new Date()
        };

        if (existing.length > 0) {
            await db.update(bot_settings).set(data).where(eq(bot_settings.id, existing[0].id));
        } else {
            await db.insert(bot_settings).values(data as any);
        }
        
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Servir estáticos (Carpeta dist)
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// 3. LA SOLUCIÓN DEFINITIVA PARA EXPRESS 5:
// Usamos una expresión regular que captura absolutamente todo (.*)
app.get(/^\/(?!api).+/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// POST /api/bot/welcome - VERSION DIAGNOSTICO
app.post("/api/bot/welcome", async (req, res) => {
    console.log("📨 [API] Recibida petición de bienvenida para:", req.body.phone);
    try {
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL no configurada");
        const db = getDb(dbUrl);

        const { phone, email } = req.body;
        if (!phone) return res.status(400).json({ error: "Falta el número de teléfono" });

        // 1. Diagnóstico de Base de Datos
        console.log("🔍 [API] Consultando configuración del bot...");
        const config = await db.select().from(bot_settings).limit(1).catch(err => {
            console.error("❌ [API] Error al consultar bot_settings:", err.message);
            throw err;
        });

        if (config.length === 0 || !config[0].isEnabled) {
            console.log("⚠️ [API] Bot desactivado en la configuración.");
            return res.json({ success: false, message: "Bot desactivado o sin configurar en el panel" });
        }

        const template = config[0].welcomeMessage || "¡Hola {nombre}! Bienvenido a GSM-FIX.";
        const nombre = email ? email.split('@')[0] : 'Usuario';
        const message = template.replace(/{nombre}/g, nombre);
        
        // 2. Diagnóstico de Envío
        console.log(`🚀 [API] Intentando enviar WhatsApp a ${phone}...`);
        
        // Agregamos un timeout manual para que la API no se quede colgada si el bot se tilda
        const sendPromise = sendWhatsAppMessage(phone, message);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout de 15s esperando al Bot")), 15000)
        );

        const success = await Promise.race([sendPromise, timeoutPromise]) as boolean;

        console.log(success ? "✅ [API] Bot confirmó envío exitoso." : "❌ [API] Bot reportó falla en el envío.");
        
        return res.json({ 
            success, 
            message: success ? "Mensaje enviado" : "El bot está conectado pero no pudo procesar el envío" 
        });

    } catch (error: any) {
        console.error("💥 [API] ERROR CRÍTICO EN RUTA WELCOME:", error.message);
        return res.status(500).json({ 
            success: false, 
            error: error.message,
            step: "Revisá los logs de Railway para ver dónde se trabó" 
        });
    }
});

// 4. Encendido del motor
const PORT = Number(process.env.PORT) || 5000;
console.log(`🚀 Intentando arrancar servidor en puerto ${PORT}...`);

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅ Servidor en línea en puerto ${PORT} (0.0.0.0)`);
    
    // Inicializar Automatizaciones
    initWhatsApp();
    startCronJobs();

    // Diagnóstico de arranque profundo (NON-BLOCKING)
    console.log("🔍 [Arranque] Iniciando diagnóstico de base de datos...");
    
    const dbDiscovery = async () => {
        try {
            const dbUrl = process.env.DATABASE_URL;
            if (!dbUrl) {
                console.log("⚠️ [Arranque] DATABASE_URL ausente.");
                return;
            }

            const db = getDb(dbUrl);
            console.log("🔍 [Arranque] Iniciando exploración exhaustiva de esquemas...");

            // 1. Forzar esquema public inmediatamente
            try {
                await db.execute(sql.raw(`SET search_path TO public`));
                console.log("🛠️ [Arranque] search_path forzado a 'public'.");
            } catch (e) { console.warn("⚠️ [Arranque] Falló SET search_path."); }

            // 2. Reporte de Base de Datos
            try {
                const dbInfo = await db.execute(sql.raw(`SELECT current_database(), current_user, session_user`));
                const info = dbInfo.rows[0];
                console.log(`📡 [Arranque] DB: ${info.current_database} | User: ${info.current_user} | Session: ${info.session_user}`);
            } catch (e) { console.warn("⚠️ [Arranque] No se pudo obtener info de sesión."); }

            // 3. Exploración de Esquemas (information_schema.schemata)
            try {
                const schemasRes = await db.execute(sql.raw(`SELECT schema_name FROM information_schema.schemata`));
                const schemas = schemasRes.rows.map((r: any) => r.schema_name as string);
                console.log(`🌍 [Arranque] ESQUEMAS DISPONIBLES: [${schemas.join(", ")}]`);

                // 4. Búsqueda de la tabla 'users' en todos los esquemas relevantes
                for (const schemaName of schemas.filter((s: string) => !s.startsWith('pg_') && s !== 'information_schema')) {
                    try {
                        const countRes = await db.execute(sql.raw(`SELECT count(*) as count FROM "${schemaName}"."users"`));
                        const count = countRes.rows[0].count;
                        console.log(`✅ [Arranque] Tabla 'users' ENCONTRADA en esquema '${schemaName}'. Filas: ${count}`);
                        if (schemaName === 'public') {
                            console.log(`📊 [Arranque] Conteo de usuarios detectados: [${count}]`);
                        }
                    } catch (e) {
                        // Silencioso para no ensuciar si no existe en ese esquema
                    }
                }
            } catch (e: any) {
                console.error("❌ [Arranque] Falló la exploración de esquemas:", e.message);
            }

            // 5. Inventario de tablas en public (Directo)
            try {
                const tablesRes = await db.execute(sql.raw(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`));
                const tableNames = tablesRes.rows.map(r => r.table_name);
                console.log(`📑 [Arranque] TABLAS EN 'public': [${tableNames.join(", ")}]`);
            } catch (e) { console.warn("⚠️ [Arranque] Falló el listado simple de tablas public."); }

        } catch (e: any) {
            console.error("❌ [Arranque] Error crítico en discovery:", e.message);
        }
    };

    // Run discovery without blocking the main event loop
    dbDiscovery();
});