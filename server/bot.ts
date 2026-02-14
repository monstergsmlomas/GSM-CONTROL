import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

// Usamos 'any' para evitar conflictos con la importación especial
let client: any;

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

    client.on('qr', (qr: string) => {
        console.log('✨ [WhatsApp] NUEVO CÓDIGO QR DETECTADO. ESCANEA PARA VINCULAR:');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('✅ [WhatsApp] Cliente listo y conectado!');
    });

    client.on('authenticated', () => {
        console.log('🔓 [WhatsApp] Autenticado correctamente.');
    });

    client.on('auth_failure', (msg: string) => {
        console.error('❌ [WhatsApp] Error de autenticación:', msg);
    });

    client.initialize().catch((err: any) => {
        console.error('❌ [WhatsApp] Error al inicializar:', err);
    });
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
    try {
        if (!client) {
            console.error("❌ [WhatsApp] Cliente no inicializado.");
            return false;
        }

        const formattedNumber = to.replace(/\D/g, '');
        const chatId = `${formattedNumber}@c.us`;
        
        await client.sendMessage(chatId, message);
        console.log(`📨 [WhatsApp] Mensaje enviado a ${formattedNumber}`);
        return true;
    } catch (error: any) {
        console.error(`❌ [WhatsApp] Error enviando a ${to}:`, error);
        return false;
    }
};

export default { initWhatsApp, sendWhatsAppMessage };