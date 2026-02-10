import express from 'express';
import cors from 'cors';
import { db } from './db/index.js';
import { subscriptions } from './db/schema.js';
import { checkLicense } from './middleware/checkLicense.js';
import { eq, sql } from 'drizzle-orm';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Public route
app.get('/', (req, res) => {
    res.send('GSM Control API Running');
});

// --- ADMIN API ---

// Get all subscriptions
app.get('/api/admin/users', async (req, res) => {
    try {
        const data = await db.select().from(subscriptions);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// Manual Renewal (Extend subscription)
app.post('/api/admin/renew', async (req, res) => {
    const { user_uid, days } = req.body;

    if (!user_uid || !days) {
        return res.status(400).json({ error: 'Missing user_uid or days' });
    }

    try {
        const sub = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.user_uid, user_uid)
        });

        if (!sub) {
            // Create new if not exists (optional, or error)
            // For simplicity, let's create one or error if strictly management
            // User asked to "add +30 days", implying existence.
            // Let's create if not exists for easier testing.
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + Number(days));

            await db.insert(subscriptions).values({
                user_uid,
                status: 'active',
                plan_type: 'monthly',
                expires_at: expiresAt
            });
            return res.json({ message: 'Subscription created and activated' });
        }

        // Extend existing
        let currentExpires = new Date(sub.expires_at);
        const now = new Date();

        // If already expired, start from now
        if (currentExpires < now) {
            currentExpires = now;
        }

        currentExpires.setDate(currentExpires.getDate() + Number(days));

        await db.update(subscriptions)
            .set({
                expires_at: currentExpires,
                status: 'active'
            })
            .where(eq(subscriptions.user_uid, user_uid));

        res.json({ message: `Subscription extended by ${days} days`, new_expiry: currentExpires });

    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// Mock endpoint to create a user (for seeding)
app.post('/api/admin/seed', async (req, res) => {
    const { user_uid } = req.body;
    try {
        await db.insert(subscriptions).values({
            user_uid,
            status: 'trial',
            plan_type: 'monthly',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days trial
        });
        res.json({ message: 'User seeded' });
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});


// --- APP INTEGRATION ---

// Protected route example
app.get('/api/protected/features', checkLicense, (req, res) => {
    res.json({ features: ['repairs', 'inventory', 'reports'] });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
