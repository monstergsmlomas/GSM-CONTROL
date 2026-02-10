import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let db;

async function initializeDB() {
    db = await open({ filename: 'subscriptions.db', driver: sqlite3.Database });

    await db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shopName TEXT NOT NULL,
      email TEXT NOT NULL,
      whatsapp TEXT,
      plan TEXT NOT NULL,
      status TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      hwid TEXT DEFAULT '[]', 
      max_devices INTEGER DEFAULT 4
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entityId TEXT NOT NULL,
      details TEXT NOT NULL,
      user TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);
    try { await db.exec(`ALTER TABLE subscriptions ADD COLUMN max_devices INTEGER DEFAULT 4`); } catch (e) { }
    console.log('🛡️ System Ready (Full Edit Enabled).');
}

initializeDB();

async function logAction(action, entityId, details, user = 'Admin') {
    const timestamp = new Date().toISOString();
    try {
        await db.run('INSERT INTO audit_logs (action, entity, entityId, details, user, timestamp) VALUES (?, ?, ?, ?, ?, ?)', [action, 'Subscription', entityId, details, user, timestamp]);
    } catch (err) { console.error(err); }
}

// --- API ROUTES ---

// VALIDATE
app.post('/api/validate', async (req, res) => {
    const { email, hwid, device_name } = req.body;
    if (!email || !hwid) return res.status(400).json({ status: 'error', message: 'Missing data' });

    try {
        const user = await db.get('SELECT * FROM subscriptions WHERE email = ?', email);
        if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

        if (user.status === 'banned') return res.json({ status: 'banned', message: 'BANNED' });
        if (new Date(user.expiresAt) < new Date() || user.status === 'expired') return res.json({ status: 'expired', message: 'Expired' });

        let devices = [];
        try { devices = JSON.parse(user.hwid || '[]'); } catch (e) { devices = [] }
        if (!Array.isArray(devices)) devices = [];

        const existingIndex = devices.findIndex(d => d.id === hwid);
        if (existingIndex !== -1) {
            devices[existingIndex].last_seen = new Date().toISOString();
            if (device_name) devices[existingIndex].name = device_name;
            await db.run('UPDATE subscriptions SET hwid = ? WHERE id = ?', [JSON.stringify(devices), user.id]);
            return res.json({ status: 'active', message: 'Access Granted' });
        }

        if (devices.length < user.max_devices) {
            const newDevice = { id: hwid, name: device_name || `PC-${devices.length + 1}`, added_at: new Date().toISOString(), last_seen: new Date().toISOString() };
            devices.push(newDevice);
            await db.run('UPDATE subscriptions SET hwid = ? WHERE id = ?', [JSON.stringify(devices), user.id]);
            await logAction('SYSTEM', user.id, `Nuevo disp. vinculado: ${newDevice.name}`, 'System');
            return res.json({ status: 'active', message: 'New Device Bound' });
        } else {
            await logAction('SECURITY', user.id, `Bloqueo Cupo Lleno`, 'System');
            return res.json({ status: 'denied', message: 'Device Limit Reached' });
        }
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// REMOVE DEVICE
app.post('/api/remove-device', async (req, res) => {
    const { userId, deviceId } = req.body;
    try {
        const user = await db.get('SELECT hwid FROM subscriptions WHERE id = ?', userId);
        let devices = JSON.parse(user.hwid || '[]');
        const newDevices = devices.filter(d => d.id !== deviceId);
        await db.run('UPDATE subscriptions SET hwid = ? WHERE id = ?', [JSON.stringify(newDevices), userId]);
        await logAction('UPDATE', userId, `Eliminó dispositivo específico`);
        res.json({ message: 'Device Removed' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// RESET ALL
app.post('/api/reset-hwid', async (req, res) => {
    const { id } = req.body;
    try {
        await db.run("UPDATE subscriptions SET hwid = '[]' WHERE id = ?", id);
        await logAction('UPDATE', id, `Reseteó TODOS los dispositivos`);
        res.json({ message: 'All Devices Cleared' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// UPDATE LIMIT ONLY
app.put('/api/subscriptions/:id/limit', async (req, res) => {
    const { id } = req.params;
    const { max_devices } = req.body;
    await db.run('UPDATE subscriptions SET max_devices = ? WHERE id = ?', [max_devices, id]);
    res.json({ message: 'Limit Updated' });
});

// CRUD Standard
app.get('/api/subscriptions', async (req, res) => {
    const subscriptions = await db.all('SELECT * FROM subscriptions ORDER BY id DESC');
    res.json(subscriptions);
});
app.get('/api/logs', async (req, res) => {
    const logs = await db.all('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50');
    res.json(logs);
});
app.get('/api/backup', async (req, res) => {
    const subscriptions = await db.all('SELECT * FROM subscriptions');
    const logs = await db.all('SELECT * FROM audit_logs');
    res.json({ timestamp: new Date(), subscriptions, audit_logs: logs });
});

// CREATE
app.post('/api/subscriptions', async (req, res) => {
    const { shopName, email, whatsapp, plan, status, expiresAt, max_devices, paymentMethod, paymentRef } = req.body;
    const result = await db.run('INSERT INTO subscriptions (shopName, email, whatsapp, plan, status, expiresAt, hwid, max_devices) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [shopName, email, whatsapp, plan, status, expiresAt, '[]', max_devices || 4]);

    const payInfo = paymentMethod ? ` | Pago: ${paymentMethod}` : '';
    await logAction('CREATE', result.lastID, `Creó cliente "${shopName}"${payInfo}`);

    res.json({ id: result.lastID });
});

// UPDATE (General Edit / Renew)
app.put('/api/subscriptions/:id', async (req, res) => {
    const { id } = req.params;
    const { shopName, email, whatsapp, plan, max_devices, status, expiresAt, paymentMethod, paymentRef } = req.body;

    // 1. Get current data to check what changed
    const current = await db.get('SELECT * FROM subscriptions WHERE id = ?', id);
    if (!current) return res.status(404).json({ error: 'Not found' });

    // 2. Update all fields (fallback to current if undefined)
    await db.run(`
     UPDATE subscriptions 
     SET shopName = ?, email = ?, whatsapp = ?, plan = ?, max_devices = ?, status = ?, expiresAt = ? 
     WHERE id = ?`,
        [
            shopName || current.shopName,
            email || current.email,
            whatsapp || current.whatsapp,
            plan || current.plan,
            max_devices || current.max_devices,
            status || current.status,
            expiresAt || current.expiresAt,
            id
        ]
    );

    // 3. Log Logic
    let details = '';
    if (expiresAt && expiresAt !== current.expiresAt) {
        details = `Renovación hasta ${new Date(expiresAt).toLocaleDateString()}`;
        if (paymentMethod) details += ` (${paymentMethod})`;
    } else {
        details = `Editó datos del perfil`;
    }

    await logAction('UPDATE', id, details);

    res.json({ message: 'Updated' });
});

app.post('/api/toggle-ban', async (req, res) => {
    const { id, currentStatus } = req.body;
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
    await db.run('UPDATE subscriptions SET status = ? WHERE id = ?', [newStatus, id]);
    await logAction('SECURITY', id, `${newStatus === 'banned' ? 'BLOQUEÓ' : 'DESBLOQUEÓ'} al usuario.`);
    res.json({ message: `User ${newStatus}` });
});

app.delete('/api/subscriptions/:id', async (req, res) => {
    const { id } = req.params;
    await db.run('DELETE FROM subscriptions WHERE id = ?', id);
    await logAction('DELETE', id, `Eliminó suscripción`);
    res.json({ message: 'Deleted' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
