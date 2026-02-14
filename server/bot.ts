import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import puppeteer from 'puppeteer';

let client: any;

export const initWhatsApp = () => {
    console.log("🚀 [WhatsApp] Inicializando cliente con Chromium del sistema...");
    
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './.wwebjs_auth'
        }),
        puppeteer: {
            executablePath: puppeteer.executablePath(),
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage', 
                '--disable-gpu'
            ],
            headless: true
        }
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