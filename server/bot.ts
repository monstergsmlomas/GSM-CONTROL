import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

let client: any;
let isReady = false;

export const initWhatsApp = () => {
    // Definimos la ruta EXACTA que configuraste en Railway
    const sessionPath = '/app/.wwebjs_auth';
    
    console.log(`🚀 [WhatsApp] Iniciando sesión en volumen: ${sessionPath}`);
    
    client = new Client({
        authStrategy: new LocalAuth({ 
            clientId: "gsm-fix-session", // ID fijo para la subcarpeta
            dataPath: sessionPath 
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
                '--single-process', 
                '--disable-gpu'
            ],
            timeout: 120000,
        }
    });

    client.on('qr', (qr: string) => {
        console.log('✨ [WhatsApp] QR NUEVO: Escanealo por ÚLTIMA vez.');
        qrcode.generate(qr, { small: true });
        console.log(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`);
    });

    client.on('ready', () => {
        isReady = true;
        console.log('✅ [WhatsApp] ¡BOT CONECTADO Y LISTO!');
    });

    client.on('authenticated', () => {
        console.log('🔓 [WhatsApp] Sesión autenticada. Escribiendo archivos en el volumen...');
    });

    client.initialize().catch((err: any) => console.error('❌ Error fatal:', err));
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
    try {
        if (!client || !isReady) return false;
        const cleanNumber = to.replace(/\D/g, '');
        const chatId = `${cleanNumber}@c.us`;
        
        console.log(`📨 [WhatsApp] Enviando a ${cleanNumber}...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Espera de seguridad
        await client.sendMessage(chatId, message);
        console.log(`✅ [WhatsApp] Mensaje enviado correctamente.`);
        return true;
    } catch (error: any) {
        console.error(`💥 [WhatsApp] Fallo:`, error.message);
        return false;
    }
};

export default { initWhatsApp, sendWhatsAppMessage };