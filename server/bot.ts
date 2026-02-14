import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

let client: any;
let isReady = false;

export const initWhatsApp = () => {
    console.log("🚀 [WhatsApp] Encendiendo motor ultra-ligero...");
    
    client = new Client({
        authStrategy: new LocalAuth({ 
            dataPath: './.wwebjs_auth' 
        }),
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
                '--single-process', // CLAVE: Reduce drásticamente el uso de RAM
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-extensions',
                '--disable-default-apps',
                '--font-render-hinting=none'
            ],
            timeout: 120000, // 2 minutos para el arranque inicial
            protocolTimeout: 300000
        }
    });

    client.on('qr', (qr: string) => {
        console.log('✨ [WhatsApp] NUEVO CÓDIGO QR DETECTADO.');
        qrcode.generate(qr, { small: true });
        console.log(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`);
    });

    client.on('ready', () => {
        isReady = true;
        console.log('✅ [WhatsApp] Cliente listo y conectado!');
    });

    client.on('authenticated', () => {
        console.log('🔓 [WhatsApp] Sesión validada correctamente.');
    });

    client.on('auth_failure', (msg: string) => {
        console.error('❌ [WhatsApp] Fallo de autenticación:', msg);
    });

    client.on('disconnected', (reason: any) => {
        isReady = false;
        console.log('⚠️ [WhatsApp] Bot desconectado. Razón:', reason);
    });

    client.initialize().catch((err: any) => {
        console.error('❌ [WhatsApp] Error crítico al inicializar:', err);
    });
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
    try {
        if (!client || !isReady) {
            console.error("❌ [WhatsApp] El bot no está listo para enviar mensajes.");
            return false;
        }

        const cleanNumber = to.replace(/\D/g, '');
        const chatId = `${cleanNumber}@c.us`;

        console.log(`📨 [WhatsApp] Enviando mensaje a ${cleanNumber}...`);
        await client.sendMessage(chatId, message);
        console.log(`✅ [WhatsApp] Mensaje enviado con éxito.`);
        return true;

    } catch (error: any) {
        console.error(`💥 [WhatsApp] Fallo al enviar a ${to}:`, error.message);
        return false;
    }
};

export default { initWhatsApp, sendWhatsAppMessage };