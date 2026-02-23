import { makeWASocket, DisconnectReason, Browsers, initAuthCreds, BufferJSON, proto } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { getDb } from './db.js';
import { wa_sessions } from './schema.js';
import { eq } from 'drizzle-orm';

let clientSocket: any = null;
let isReady = false;
let currentStatus = 'disconnected'; 
let currentQR: string | null = null;

// Exponer estado para el widget del Dashboard
export const getBotStatus = () => {
    return { status: currentStatus, qr: currentQR, isReady };
};

// Adaptador personalizado para guardar la sesión en PostgreSQL
const useDatabaseAuthState = async () => {
    const db = getDb(process.env.DATABASE_URL!);

    const writeData = async (data: any, id: string) => {
        const str = JSON.stringify(data, BufferJSON.replacer);
        try {
            const existing = await db.select().from(wa_sessions).where(eq(wa_sessions.id, id));
            if (existing.length > 0) {
                await db.update(wa_sessions).set({ data: str }).where(eq(wa_sessions.id, id));
            } else {
                await db.insert(wa_sessions).values({ id, data: str });
            }
        } catch (error) {
            console.error("❌ [WhatsApp DB] Error escribiendo clave:", id);
        }
    };

    const readData = async (id: string) => {
        try {
            const existing = await db.select().from(wa_sessions).where(eq(wa_sessions.id, id));
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
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
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
    console.log(`🚀 [WhatsApp] Iniciando sesión (Modo Base de Datos Profesional)...`);
    currentStatus = 'connecting';
    
    // Conectamos a Baileys con nuestra base de datos
    const { state, saveCreds } = await useDatabaseAuthState();

    const connectToWhatsApp = () => {
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: Browsers.macOS('Desktop'),
            syncFullHistory: false,
            generateHighQualityLinkPreview: false
        });

        clientSocket = sock;
        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                currentStatus = 'qr';
                currentQR = qr;
                console.log('✨ [WhatsApp] QR NUEVO: Escanealo para vincular.');
                qrcode.generate(qr, { small: true });
                console.log(`Link para ver QR: https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`);
            }
            
            if (connection === 'connecting') {
                currentStatus = 'connecting';
                console.log('⏳ [WhatsApp] Negociando conexión con los servidores...');
            }

            if (connection === 'close') {
                currentQR = null;
                isReady = false;
                const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                console.log(`❌ [WhatsApp] Conexión cerrada. Reconectando: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    currentStatus = 'connecting';
                    connectToWhatsApp();
                } else {
                    currentStatus = 'disconnected';
                    console.log('🛑 [WhatsApp] Sesión cerrada desde el celular. Borrando base de datos para escanear nuevo QR...');
                    try {
                        const db = getDb(process.env.DATABASE_URL!);
                        await db.delete(wa_sessions); // Si te deslogueás a mano, borra las tablas solas para que puedas escanear otro
                    } catch (e) {}
                }
            } else if (connection === 'open') {
                currentStatus = 'connected';
                currentQR = null;
                isReady = true;
                console.log('✅ [WhatsApp] ¡BOT CONECTADO Y BLINDADO EN LA BASE DE DATOS!');
            }
        });
    };

    connectToWhatsApp();
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
    try {
        if (!clientSocket || !isReady) {
            console.log('⚠️ [WhatsApp] Intento de envío, pero el bot no está listo.');
            return false;
        }
        const cleanNumber = to.replace(/\D/g, '');
        const jid = `${cleanNumber}@s.whatsapp.net`;
        
        console.log(`📨 [WhatsApp] Enviando a ${cleanNumber}...`);
        await clientSocket.sendMessage(jid, { text: message });
        console.log(`✅ [WhatsApp] Mensaje enviado correctamente.`);
        return true;
    } catch (error: any) {
        console.error(`💥 [WhatsApp] Fallo al enviar:`, error.message);
        return false;
    }
};

export default { initWhatsApp, sendWhatsAppMessage, getBotStatus };