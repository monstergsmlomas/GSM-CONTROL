
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import { getDb } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

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


// GET /api/metrics
app.get("/api/metrics", async (req, res) => {
    try {
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);
        
        const allUsers = await db.select().from(users);
        
        const total = allUsers.length;
        const active = allUsers.filter(u => u.subscriptionStatus === 'active').length;
        const trialing = allUsers.filter(u => u.subscriptionStatus === 'trialing').length;
        
        // Simulating "last 5 registered" based on currentPeriodEnd or just slice for now 
        // since we don't have a createdAt in the new schema, but GSM FIX might have it.
        // If not, we just take the last 5 in the array.
        const lastFive = allUsers.slice(-5).reverse();

        res.json({
            total,
            active,
            trialing,
            lastFive
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
        
        // Map to frontend interface: DashboardUser
        // Frontend expects: id, nombre, email, plan, ciclo, vencimiento, monto_pago, estado, proyecto, fechaAlta
        
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
                plan: planMapped as any
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
        const { subscriptionStatus, trialEndsAt } = req.body;
        
        const dbUrl = (req.headers['x-db-url'] as string) || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL not configured");
        const db = getDb(dbUrl);

        const updateData: any = {};
        
        if (subscriptionStatus) {
            updateData.subscriptionStatus = subscriptionStatus;
        }

        if (trialEndsAt) {
            const translatedDate = new Date(trialEndsAt);
            updateData.trialEndsAt = translatedDate;
            
            const now = new Date();
            if (translatedDate > now && (!subscriptionStatus || subscriptionStatus === 'expired')) {
                updateData.subscriptionStatus = 'trialing';
            }
        }

        await db.update(users)
            .set(updateData)
            .where(eq(users.id, id));

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
            plan: planMapped as any
        };

        res.json(mappedUser);
    } catch (error: any) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Failed to update user" });
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
