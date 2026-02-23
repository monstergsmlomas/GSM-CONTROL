import { makeWASocket, DisconnectReason, Browsers, initAuthCreds, BufferJSON, proto } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { getDb } from './db.js';
import { wa_sessions } from './schema.js';
import { eq, inArray } from 'drizzle-orm';

let clientSocket: any = null;
let isReady = false;
let currentStatus = 'disconnected'; 
let currentQR: string | null = null;
let qrLink: string | null = null;

export const getBotStatus = () => {
    return { status: currentStatus, qr: currentQR, qrLink, isReady };
};

const useDatabaseAuthState = async () => {
    const db = getDb(process.env.DATABASE_URL!);

    const writeData = async (data: any, id: string) => {
        const str = JSON.stringify(data, BufferJSON.replacer);
        try {
            await db.insert(wa_sessions)
                .values({ id, data: str })
                .onConflictDoUpdate({
                    target: wa_sessions.id,
                    set: { data: str }
                });
            console.log(`💾 [WhatsApp DB] Dato guardado: ${id}`);
        } catch (error) {
            console.error("❌ [WhatsApp DB] Error escribiendo:", id);
        }
    };

    const readData = async (id: string) => {
        try {
            const existing = await db.select().from(wa_sessions).where(eq(wa_sessions.id, id)).limit(1);
            if (existing.length > 0) {
                return JSON.parse(existing[0].data, BufferJSON.reviver);
            }
        } catch (error) {
            return null;
        }
    };

    const removeData = async (id: string) => {
        try {
            await db.delete(wa_sessions).where(eq(wa_sessions.id, id));
        } catch (error) {}
    };

    const creds = await readData('creds') || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type: string, ids: string[]) => {
                    const data: { [_: string]: any } = {};
                    const keys = ids.map(id => `${type}-${id}`);
                    try {
                        const results = await db.select().from(wa_sessions).where(inArray(wa_sessions.id, keys));
                        for (const row of results) {
                            const originalId = row.id.replace(`${type}-`, '');
                            let value = JSON.parse(row.data, BufferJSON.reviver);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[originalId] = value;
                        }
                    } catch (error) {}
                    return data;
                },
                set: async (data: any) => {
                    const tasks: Promise<void>[] = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) tasks.push(writeData(value, key));
                            else tasks.push(removeData(key));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => writeData(creds, 'creds')
    };
};

export const initWhatsApp = async () => {
    console.log(`🚀 [WhatsApp] Iniciando motor con persistencia en DB...`);
    currentStatus = 'connecting';
    
    const { state, saveCreds } = await useDatabaseAuthState();

    const connectToWhatsApp = () => {
        if (clientSocket) {
            clientSocket.ev.removeAllListeners('connection.update');
            clientSocket.ev.removeAllListeners('creds.update');
        }

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: Browsers.macOS('GSM-Control'), 
            syncFullHistory: false,
            connectTimeoutMs: 60000,
        });

        clientSocket = sock;
        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                currentStatus = 'qr';
                currentQR = qr;
                qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;
                qrcode.generate(qr, { small: true });
            }
            
            if (connection === 'close') {
                isReady = false;
                const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                if (statusCode !== DisconnectReason.loggedOut) {
                    currentStatus = 'connecting';
                    setTimeout(() => connectToWhatsApp(), 5000);
                } else {
                    currentStatus = 'disconnected';
                    const db = getDb(process.env.DATABASE_URL!);
                    await db.delete(wa_sessions);
                }
            } else if (connection === 'open') {
                currentStatus = 'connected';
                currentQR = null;
                qrLink = null;
                isReady = true;
                await saveCreds(); // Forzado al conectar
                console.log('✅ [WhatsApp] ¡SESIÓN GUARDADA EN DB Y CONECTADA!');
            }
        });
    };

    connectToWhatsApp();
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
    try {
        if (!clientSocket || !isReady) return false;
        const jid = `${to.replace(/\D/g, '')}@s.whatsapp.net`;
        await clientSocket.sendMessage(jid, { text: message });
        return true;
    } catch (error) {
        return false;
    }
};

export default { initWhatsApp, sendWhatsAppMessage, getBotStatus };