import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

let client: Client;

export const initWhatsApp = () => {
    console.log("🚀 [WhatsApp] Inicializando cliente...");
    
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './.wwebjs_auth'
        }),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        }
    });

    client.on('qr', (qr) => {
        console.log('✨ [WhatsApp] NUEVO CÓDIGO QR DETECTADO. ESCANEA PARA VINCULAR:');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('✅ [WhatsApp] Cliente listo y conectado!');
    });

    client.on('authenticated', () => {
        console.log('🔓 [WhatsApp] Autenticado correctamente.');
    });

    client.on('auth_failure', (msg) => {
        console.error('❌ [WhatsApp] Error de autenticación:', msg);
    });

    client.initialize().catch(err => {
        console.error('❌ [WhatsApp] Error al inicializar:', err);
    });
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
    try {
        if (!client) {
            console.error("❌ [WhatsApp] Cliente no inicializado.");
            return false;
        }

        // Formatear el número (eliminar espacios, +, etc.)
        const formattedNumber = to.replace(/\D/g, '');
        const chatId = `${formattedNumber}@c.us`;
        
        await client.sendMessage(chatId, message);
        console.log(`📨 [WhatsApp] Mensaje enviado a ${formattedNumber}`);
        return true;
    } catch (error) {
        console.error(`❌ [WhatsApp] Error enviando a ${to}:`, error);
        return false;
    }
};

export default { initWhatsApp, sendWhatsAppMessage };
