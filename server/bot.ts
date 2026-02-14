import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

let client: any;

export const initWhatsApp = () => {
    console.log("🚀 [WhatsApp] Encendiendo motores... (Esto puede demorar en Railway)");
    
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './.wwebjs_auth'
        }),
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
            protocolTimeout: 300000 // <-- Le damos 5 minutos de tolerancia al servidor
        }
    });

    client.on('loading_screen', (percent: string, message: string) => {
        console.log(`⏳ [WhatsApp] Cargando Web: ${percent}% - ${message}`);
    });

    client.on('qr', (qr: string) => {
        console.log('✨ [WhatsApp] NUEVO CÓDIGO QR DETECTADO.');
        qrcode.generate(qr, { small: true });
        
        console.log('🔗 SI EL QR SE VE DEFORMADO, HAZ CLIC EN ESTE ENLACE PARA VERLO PERFECTO:');
        console.log(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`);
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

    client.on('disconnected', (reason: any) => {
        console.log('⚠️ [WhatsApp] Bot desconectado. Razón:', reason);
    });

    console.log("⏳ [WhatsApp] Iniciando cliente (Esperando al navegador invisible)...");
    
    client.initialize()
        .then(() => console.log("🏁 [WhatsApp] Comando de inicialización finalizado."))
        .catch((err: any) => {
            console.error('❌ [WhatsApp] Error FATAL al inicializar:', err);
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