
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

app.use(cors());
app.use(express.json());

// Middlewares

app.use((req, res, next) => {
    // Skip for non-api routes
    if (!req.path.startsWith('/api')) return next();
    
    // Header check relaxed: if missing, routes will use default DATABASE_URL from .env
    next();
});

// GET /api/logs
app.get("/api/logs", async (req, res) => {
    try {
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);
        
        const logs = await db.select()
            .from(audit_logs)
            .orderBy(desc(audit_logs.fecha));
        
        res.json(logs);
    } catch (error: any) {
        console.error("Error fetching logs (Returning empty array):", error);
        res.json([]); // Return empty array instead of 500
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
        console.error("Error creating audit log:", error);
        res.status(500).json({ error: "Failed to create audit log" });
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
        console.error("Error fetching metrics:", error);
        res.status(500).json({ error: "Failed to fetch metrics" });
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
        .leftJoin(settings, eq(sql`${users.id}::text`, settings.userId));

        console.log(`Found ${allWithSettings.length} users with settings join.`);
        
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
        console.error("CRITICAL ERROR in GET /api/users:");
        console.error("- Message:", error.message);
        console.error("- Table info: users (id uuid), settings (user_id text, phone text)");
        console.error("- Stack Trace:", error.stack);
        
        res.status(500).json({ 
            error: "Failed to fetch users from database", 
            details: error.message,
            diagnostic: "Please check if columns id (uuid) and user_id (text) exist in your Supabase tables."
        });
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
        .leftJoin(settings, eq(sql`${users.id}::text`, settings.userId))
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
            telefono: s?.phone || ''
        };

        res.json(mappedUser);
    } catch (error: any) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Failed to update user" });
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
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

// GET /api/check-db (Visual Diagnostic)
app.get("/api/check-db", async (req, res) => {
    try {
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);
        
        const allUsers = await db.select().from(users);
        
        res.json({
            status: "Conectado",
            total_users: allUsers.length,
            database_url_active: true,
            emails_encontrados: allUsers.map(u => u.email)
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

// 2. Servir estáticos (Carpeta dist)
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// 3. LA SOLUCIÓN DEFINITIVA PARA EXPRESS 5:
// Usamos una expresión regular que captura absolutamente todo (.*)
app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// 4. Encendido del motor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor en línea en puerto ${PORT}`);
});
