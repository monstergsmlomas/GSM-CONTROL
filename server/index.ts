
import express from "express";
import cors from "cors";
import { getDb } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Middleware to check for Database URL Header
app.use((req, res, next) => {
    // Skip for non-api routes or health checks if any
    if (req.path === '/') return next();
    
    // We allow passing via header for the dynamic config requirement
    const dbUrl = req.headers['x-db-url'] as string;
    
    if (!dbUrl && req.path.startsWith('/api')) {
        return res.status(400).json({ error: "Missing x-db-url header. Please configure Database in Settings." });
    }
    
    // Attach db to request object (simulated via local variable usage in routes)
    // In a real app we might attach to req.db, but here we just pass the url to getDb
    next();
});

// GET /api/users
app.get("/api/users", async (req, res) => {
    try {
        const dbUrl = req.headers['x-db-url'] as string;
        const db = getDb(dbUrl);
        
        const allUsers = await db.select().from(users);
        
        // Map to match frontend interface if needed (though we tried to match schema)
        // Frontend expects: id, name, email, plan, status, app_context, joinedAt
        // DB has: id, name, email, plan, status, appContext, joinedAt
        
        const mappedUsers = allUsers.map(u => ({
            ...u,
            app_context: u.appContext, // Map snake_case to frontend expected prop
            joinedAt: u.joinedAt ? new Date(u.joinedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        }));

        res.json(mappedUsers);
    } catch (error: any) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to connect to database or fetch users. Check your connection string." });
    }
});

// POST /api/users (Create)
app.post("/api/users", async (req, res) => {
    try {
        const dbUrl = req.headers['x-db-url'] as string;
        const db = getDb(dbUrl);
        const newUser = req.body;
        
        await db.insert(users).values({
            name: newUser.name,
            email: newUser.email,
            plan: newUser.plan || 'Free',
            status: newUser.status || 'Activo',
            appContext: newUser.app_context || 'GSM FIX',
        });
        
        res.status(201).json({ success: true });
    } catch (error) {
         res.status(500).json({ error: "Failed to create user" });
    }
});

// PUT /api/users/:id/plan
app.put("/api/users/:id/plan", async (req, res) => {
     try {
        const dbUrl = req.headers['x-db-url'] as string;
        const db = getDb(dbUrl);
        const { plan } = req.body;
        const userId = parseInt(req.params.id);

        await db.update(users)
            .set({ plan })
            .where(eq(users.id, userId));
            
        res.json({ success: true });
    } catch (error) {
         res.status(500).json({ error: "Failed to update plan" });
    }
});

app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON http://localhost:${PORT}`);
});
