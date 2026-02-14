import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

let client: any;
let isReady = false;

export const initWhatsApp = () => {
    console.log("🚀 [WhatsApp] Iniciando con persistencia en /app/.wwebjs_auth...");
    
    client = new Client({
        authStrategy: new LocalAuth({ 
            // CAMBIO CLAVE: Usamos la ruta absoluta del volumen de Railway
            clientId: "gsm-fix-session",
            dataPath: '/app/.wwebjs_auth' 
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
                '--single-process', // Ahorra mucha RAM en Railway
                '--disable-gpu',
                '--disable-extensions'
            ],
            executablePath: process.env.CHROME_PATH || undefined,
            timeout: 120000,
        }
    });

    client.on('qr', (qr: string) => {
        console.log('✨ [WhatsApp] NUEVO QR: Escanealo por ÚLTIMA vez.');
        qrcode.generate(qr, { small: true });
        console.log(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`);
    });

    client.on('ready', () => {
        isReady = true;
        console.log('✅ [WhatsApp] Cliente listo y conectado!');
    });

    client.on('authenticated', () => {
        console.log('🔓 [WhatsApp] Sesión autenticada. Guardando en volumen...');
    });

    client.on('disconnected', (reason: any) => {
        isReady = false;
        console.log('⚠️ [WhatsApp] Desconectado. Razón:', reason);
    });

    client.initialize().catch((err: any) => console.error('❌ Error fatal:', err));
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
    try {
        if (!client || !isReady) return false;

        const cleanNumber = to.replace(/\D/g, '');
        const chatId = `${cleanNumber}@c.us`;

        console.log(`📨 [WhatsApp] Enviando a ${cleanNumber}...`);
        
        // El secreto: un pequeño delay para evitar el error de "detached Frame"
        await new Promise(resolve => setTimeout(resolve, 3000));
        await client.sendMessage(chatId, message);
        
        console.log(`✅ [WhatsApp] Enviado con éxito.`);
        return true;
    } catch (error: any) {
        console.error(`💥 [WhatsApp] Fallo:`, error.message);
        return false;
    }
};

export default { initWhatsApp, sendWhatsAppMessage };