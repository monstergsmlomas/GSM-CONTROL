import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

let client: any;
let isReady = false;

export const initWhatsApp = () => {
    console.log("🚀 [WhatsApp] Encendiendo motor optimizado...");
    
    client = new Client({
        authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
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
                '--disable-gpu',
                '--disable-extensions', // Ahorra RAM
                '--disable-default-apps' // Ahorra RAM
            ],
            timeout: 60000,
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

    client.on('disconnected', () => {
        isReady = false;
        console.log('⚠️ [WhatsApp] Bot desconectado.');
    });

    client.initialize().catch((err: any) => console.error('❌ Error fatal:', err));
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
    try {
        if (!client || !isReady) {
            console.error("❌ [WhatsApp] Bot no está listo todavía.");
            return false;
        }

        // Limpiar número y preparar ID
        const cleanNumber = to.replace(/\D/g, '');
        const chatId = `${cleanNumber}@c.us`;

        console.log(`📡 [WhatsApp] Verificando número: ${chatId}...`);
        
        // Verificamos si el número es válido antes de enviar
        const isRegistered = await client.isRegisteredUser(chatId);
        if (!isRegistered) {
            console.error(`❌ [WhatsApp] El número ${cleanNumber} no está registrado en WhatsApp.`);
            return false;
        }

        console.log(`📨 [WhatsApp] Enviando mensaje a ${cleanNumber}...`);
        await client.sendMessage(chatId, message);
        console.log(`✅ [WhatsApp] Mensaje entregado con éxito.`);
        return true;

    } catch (error: any) {
        console.error(`💥 [WhatsApp] Fallo interno al enviar:`, error.message);
        return false;
    }
};

export default { initWhatsApp, sendWhatsAppMessage };