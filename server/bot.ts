import { makeWASocket, DisconnectReason, Browsers, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import path from 'path';

let clientSocket: any = null;
let isReady = false;
let currentStatus = 'disconnected'; 
let currentQR: string | null = null;
let qrLink: string | null = null;

// Carpeta donde se guardará la sesión en el servidor (fuera de la DB)
const AUTH_PATH = path.join(process.cwd(), 'auth_info');

export const getBotStatus = () => {
    return { status: currentStatus, qr: currentQR, qrLink, isReady };
};

export const initWhatsApp = async () => {
    console.log(`🚀 [WhatsApp] Iniciando motor en modo LOCAL (v2.0)...`);
    currentStatus = 'connecting';
    
    // Usamos persistencia en archivos locales, NO en la base de datos
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);

    const connectToWhatsApp = () => {
        if (clientSocket) {
            clientSocket.ev.removeAllListeners('connection.update');
            clientSocket.ev.removeAllListeners('creds.update');
        }

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true, // Esto mostrará el QR en los logs de Render
            browser: Browsers.macOS('GSM-Control'), 
            syncFullHistory: false,
            connectTimeoutMs: 60000,
        });

        clientSocket = sock;

        // Guardar credenciales automáticamente en la carpeta auth_info
        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                currentStatus = 'qr';
                currentQR = qr;
                qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;
                // Imprime el QR pequeño en la terminal/logs
                qrcode.generate(qr, { small: true });
            }
            
            if (connection === 'close') {
                isReady = false;
                const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                
                if (statusCode !== DisconnectReason.loggedOut) {
                    currentStatus = 'connecting';
                    console.log('🔄 Reconectando WhatsApp...');
                    setTimeout(() => connectToWhatsApp(), 5000);
                } else {
                    currentStatus = 'disconnected';
                    console.log('❌ Sesión cerrada. Debes escanear el QR de nuevo.');
                }
            } else if (connection === 'open') {
                currentStatus = 'connected';
                currentQR = null;
                qrLink = null;
                isReady = true;
                console.log('✅ [WhatsApp] ¡CONECTADO Y SISTEMA ONLINE!');
            }
        });
    };

    connectToWhatsApp();
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
    try {
        if (!clientSocket || !isReady) {
            console.error("⚠️ Intento de envío sin bot listo");
            return false;
        }
        const jid = `${to.replace(/\D/g, '')}@s.whatsapp.net`;
        await clientSocket.sendMessage(jid, { text: message });
        return true;
    } catch (error) {
        console.error("❌ Error enviando mensaje:", error);
        return false;
    }
};

export default { initWhatsApp, sendWhatsAppMessage, getBotStatus };