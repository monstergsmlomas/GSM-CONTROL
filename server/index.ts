
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import { getDb } from "./db";
import { users, audit_logs } from "./schema";
import { eq, desc } from "drizzle-orm";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

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
        console.error("Error fetching logs:", error);
        res.status(500).json({ error: "Failed to fetch audit logs" });
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
        const logs = await db.select()
            .from(audit_logs)
            .orderBy(desc(audit_logs.fecha))
            .limit(5);
        
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
        
        const allUsers = await db.select().from(users);
        
        const mappedUsers = allUsers.map(u => {
            const planRaw = (u.plan || 'Estandar').toLowerCase();
            let planMapped = 'Estandar';
            if (planRaw.includes('premium')) planMapped = 'Premium AI';
            else if (planRaw.includes('multi')) planMapped = 'Multisede';
            else if (planRaw.includes('free')) planMapped = 'Free';
            else if (planRaw.includes('estandar')) planMapped = 'Estandar';

            return {
                id: u.id,
                email: u.email,
                nombre: u.email.split('@')[0], 
                fechaAlta: u.trialEndsAt ? new Date(u.trialEndsAt).toISOString() : new Date().toISOString(),
                trialEndsAt: u.trialEndsAt ? new Date(u.trialEndsAt).toISOString() : null,
                subscriptionStatus: (u.subscriptionStatus || 'expired').toLowerCase() as 'active' | 'trialing' | 'expired',
                plan: planMapped as any,
                cicloDePago: (u.cicloDePago || 'mensual') as any,
                sucursalesExtra: u.sucursalesExtra || 0,
                currentPeriodEnd: u.currentPeriodEnd ? new Date(u.currentPeriodEnd).toISOString() : null
            };
        });

        res.json(mappedUsers);
    } catch (error: any) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users", details: error.message });
    }
});

// PATCH /api/users/:id
app.patch("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { subscriptionStatus, trialEndsAt, responsable, ciclo_de_pago, sucursales_extra, currentPeriodEnd } = req.body;
        
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

        await db.update(users)
            .set(updateData)
            .where(eq(users.id, id));

        // Insert Audit Log using strict types
        await db.insert(audit_logs).values({
            accion: 'Actualización de Cliente',
            detalle: `Cambio de estado a ${subscriptionStatus || 'N/A'}`,
            responsable: responsable || "Sistema",
            monto: 0,
            fecha: new Date()
        });

        // Fetch updated user to return it in frontend format
        const [u] = await db.select().from(users).where(eq(users.id, id));
        
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
            currentPeriodEnd: u.currentPeriodEnd ? new Date(u.currentPeriodEnd).toISOString() : null
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
            detalle: `Usuario ID ${id} eliminado permanentemente`,
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

app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON http://localhost:${PORT}`);
});
