import { makeWASocket, DisconnectReason, Browsers, initAuthCreds, BufferJSON, proto } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { getDb } from './db.js';
import { wa_sessions } from './schema.js';
import { eq, inArray } from 'drizzle-orm';

let clientSocket: any = null;
let isReady = false;
let currentStatus = 'disconnected'; 
let currentQR: string | null = null;

export const getBotStatus = () => {
    return { status: currentStatus, qr: currentQR, isReady };
};

const useDatabaseAuthState = async () => {
    const db = getDb(process.env.DATABASE_URL!);

    // Helper para escribir con reintentos básicos
    const writeData = async (data: any, id: string) => {
        const str = JSON.stringify(data, BufferJSON.replacer);
        try {
            await db.insert(wa_sessions)
                .values({ id, data: str })
                .onConflictDoUpdate({
                    target: wa_sessions.id,
                    set: { data: str }
                });
        } catch (error) {
            console.error("❌ [WhatsApp DB] Error escribiendo clave:", id);
        }
    };

    const readData = async (id: string) => {
        try {
            const existing = await db.select().from(wa_sessions).where(eq(wa_sessions.id, id)).limit(1);
            if (existing.length > 0) {
                return JSON.parse(existing[0].data, BufferJSON.reviver);
            }
        } catch (error) {
            console.error("❌ [WhatsApp DB] Error leyendo clave:", id);
        }
        return null;
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
                    
                    // MEJORA: Consulta por lotes (Batch) en lugar de uno por uno
                    try {
                        const keys = ids.map(id => `${type}-${id}`);
                        const results = await db.select()
                            .from(wa_sessions)
                            .where(inArray(wa_sessions.id, keys));

                        for (const row of results) {
                            // Extraemos el ID original (sin el prefijo del tipo)
                            const originalId = row.id.replace(`${type}-`, '');
                            let value = JSON.parse(row.data, BufferJSON.reviver);
                            
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[originalId] = value;
                        }
                    } catch (error) {
                        console.error("❌ [WhatsApp DB] Error en lectura masiva");
                    }
                    return data;
                },
                set: async (data: any) => {
                    const tasks: Promise<void>[] = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(value, key));
                            } else {
                                tasks.push(removeData(key));
                            }
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
    console.log(`🚀 [WhatsApp] Iniciando sesión (Modo DB Optimizado)...`);
    currentStatus = 'connecting';
    
    const { state, saveCreds } = await useDatabaseAuthState();

    const connectToWhatsApp = () => {
        // MEJORA: Limpiar listeners previos si existen para evitar duplicados
        if (clientSocket) {
            clientSocket.ev.removeAllListeners('connection.update');
            clientSocket.ev.removeAllListeners('creds.update');
        }

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: Browsers.macOS('Desktop'),
            syncFullHistory: false,
            // MEJora: Tiempos de espera para mayor estabilidad
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
        });

        clientSocket = sock;
        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                currentStatus = 'qr';
                currentQR = qr;
                console.log('✨ [WhatsApp] QR NUEVO generado.');
                qrcode.generate(qr, { small: true });
            }
            
            if (connection === 'connecting') {
                currentStatus = 'connecting';
            }

            if (connection === 'close') {
                currentQR = null;
                isReady = false;
                const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                console.log(`❌ [WhatsApp] Conexión cerrada. Motivo: ${statusCode}. Reconectando: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    currentStatus = 'connecting';
                    setTimeout(() => connectToWhatsApp(), 5000); // Pequeño delay para no saturar
                } else {
                    currentStatus = 'disconnected';
                    console.log('🛑 [WhatsApp] Sesión cerrada. Limpiando DB...');
                    try {
                        const db = getDb(process.env.DATABASE_URL!);
                        await db.delete(wa_sessions);
                    } catch (e) {}
                }
            } else if (connection === 'open') {
                currentStatus = 'connected';
                currentQR = null;
                isReady = true;
                console.log('✅ [WhatsApp] ¡BOT CONECTADO Y BLINDADO!');
            }
        });
    };

    connectToWhatsApp();
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
    try {
        if (!clientSocket || !isReady) {
            console.log('⚠️ [WhatsApp] Bot no listo.');
            return false;
        }
        const cleanNumber = to.replace(/\D/g, '');
        const jid = `${cleanNumber}@s.whatsapp.net`;
        await clientSocket.sendMessage(jid, { text: message });
        return true;
    } catch (error: any) {
        console.error(`💥 [WhatsApp] Fallo:`, error.message);
        return false;
    }
};

export default { initWhatsApp, sendWhatsAppMessage, getBotStatus };