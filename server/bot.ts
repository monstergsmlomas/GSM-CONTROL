import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let client: any;
let isReady = false;

export const initWhatsApp = () => {
    // CORRECCIÓN RENDER: Usamos una ruta relativa al proyecto para que funcione en cualquier lado
    const sessionPath = path.resolve(__dirname, '../../.wwebjs_auth');
    
    console.log(`🚀 [WhatsApp] Iniciando sesión en: ${sessionPath}`);
    
    client = new Client({
        authStrategy: new LocalAuth({ 
            clientId: "gsm-fix-session",
            dataPath: sessionPath 
        }),
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
        puppeteer: {
            headless: true,
            // Argumentos ULTRA-LIGHT para el plan gratuito de Render
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process', 
                '--no-zygote',
                '--disable-gpu',
                '--disable-extensions',
                '--no-first-run'
            ],
            timeout: 60000,
        }
    });

    client.on('qr', (qr: string) => {
        console.log('✨ [WhatsApp] QR NUEVO: Escanealo para vincular.');
        qrcode.generate(qr, { small: true });
        // Mantenemos el link por si no se ve bien el QR en la consola de Render
        console.log(`Link para ver QR: https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`);
    });

    client.on('ready', () => {
        isReady = true;
        console.log('✅ [WhatsApp] ¡BOT CONECTADO Y LISTO!');
    });

    client.on('authenticated', () => {
        console.log('🔓 [WhatsApp] Sesión autenticada correctamente.');
    });

    client.initialize().catch((err: any) => console.error('❌ Error fatal en el bot:', err));
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
    try {
        if (!client || !isReady) return false;
        const cleanNumber = to.replace(/\D/g, '');
        const chatId = `${cleanNumber}@c.us`;
        
        console.log(`📨 [WhatsApp] Enviando a ${cleanNumber}...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); 
        await client.sendMessage(chatId, message);
        console.log(`✅ [WhatsApp] Mensaje enviado correctamente.`);
        return true;
    } catch (error: any) {
        console.error(`💥 [WhatsApp] Fallo:`, error.message);
        return false;
    }
};

export default { initWhatsApp, sendWhatsAppMessage };