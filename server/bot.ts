import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

let client: any;

export const initWhatsApp = () => {
    console.log("🚀 [WhatsApp] Encendiendo motores...");
    
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './.wwebjs_auth'
        }),
        // ESTO ES LO QUE SOLUCIONA EL "PENDING" ETERNO:
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
            timeout: 60000,
            protocolTimeout: 300000
        }
    });

    client.on('loading_screen', (percent: string, message: string) => {
        console.log(`⏳ [WhatsApp] Cargando Web: ${percent}% - ${message}`);
    });

    client.on('qr', (qr: string) => {
        console.log('✨ [WhatsApp] NUEVO CÓDIGO QR DETECTADO.');
        qrcode.generate(qr, { small: true });
        console.log(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`);
    });

    client.on('ready', () => {
        console.log('✅ [WhatsApp] Cliente listo y conectado!');
    });

    console.log("⏳ [WhatsApp] Iniciando cliente...");
    client.initialize().catch((err: any) => {
        console.error('❌ [WhatsApp] Error al inicializar:', err);
    });
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
    try {
        if (!client) return false;

        const formattedNumber = to.replace(/\D/g, '');
        const chatId = `${formattedNumber}@c.us`;
        
        // Enviamos el mensaje
        await client.sendMessage(chatId, message);
        console.log(`📨 [WhatsApp] Mensaje enviado a ${formattedNumber}`);
        return true;
    } catch (error: any) {
        console.error(`❌ [WhatsApp] Error enviando a ${to}:`, error);
        return false;
    }
};

export default { initWhatsApp, sendWhatsAppMessage };