import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let clientSocket: any = null;
let isReady = false;

export const initWhatsApp = async () => {
    // Baileys guarda la sesión en una carpeta para no pedirte el QR cada vez que reiniciás
    const sessionPath = path.resolve(__dirname, '../../.baileys_auth');
    console.log(`🚀 [WhatsApp] Iniciando sesión (Modo Ligero) en: ${sessionPath}`);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const connectToWhatsApp = () => {
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false, // Lo imprimimos nosotros para armar el link también
            browser: ['GSM-FIX Bot', 'Chrome', '1.0.0'],
        });

        clientSocket = sock;

        // Guardar credenciales cada vez que cambian
        sock.ev.on('creds.update', saveCreds);

        // Escuchar cambios en la conexión
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('✨ [WhatsApp] QR NUEVO: Escanealo para vincular.');
                qrcode.generate(qr, { small: true });
                console.log(`Link para ver QR: https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`);
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                console.log(`❌ [WhatsApp] Conexión cerrada. Reconectando: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    connectToWhatsApp();
                } else {
                    console.log('🛑 [WhatsApp] Sesión cerrada desde el celular. Borrá la carpeta .baileys_auth para escanear un nuevo QR.');
                    isReady = false;
                }
            } else if (connection === 'open') {
                isReady = true;
                console.log('✅ [WhatsApp] ¡BOT CONECTADO Y LISTO (Cero consumo de RAM)!');
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
        
        // Limpiamos el número y le agregamos la terminación que usa Baileys
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

export default { initWhatsApp, sendWhatsAppMessage };