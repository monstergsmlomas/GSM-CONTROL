import cron from 'node-cron';
import { getDb } from './db.js';
import { users, settings, bot_settings } from './schema.js';
import { eq, sql, and, or, inArray, isNotNull } from 'drizzle-orm';
import { sendWhatsAppMessage } from './bot.js';

export const startCronJobs = () => {
    console.log("⏰ [Cron] Configurando automatizaciones de WhatsApp (10:00 AM)...");

    // Ejecutar cada día a las 10:00 AM
    cron.schedule('0 10 * * *', async () => {
        console.log("🔍 [Cron] Iniciando revisión diaria de suscripciones...");
        await runBatchAutomation();
    });
};

const runBatchAutomation = async () => {
    try {
        const db = getDb();
        
        // 1. Obtener configuración global
        const configRes = await db.select().from(bot_settings).limit(1);
        if (configRes.length === 0 || !configRes[0].isEnabled) {
            console.log("🛑 [Cron] Automatización cancelada: Bot desactivado en bot_settings.");
            return;
        }

        const config = configRes[0];
        
        // 2. Procesar Alertas de 48h
        await processAlert48h(db, config);
        
        // 3. Procesar Alertas de Fin de Trial
        await processFinishedTrials(db, config);

    } catch (error: any) {
        console.error("❌ [Cron] Error en ejecución batch:", error.message);
    }
};

/**
 * Reemplaza variables {nombre}, {plan}, {estado} en un template
 */
const replaceVariables = (template: string, { nombre, plan, estado }: { nombre: string, plan: string, estado: string }) => {
    return template
        .replace(/{nombre}/g, nombre)
        .replace(/{plan}/g, plan)
        .replace(/{estado}/g, estado);
};

const processAlert48h = async (db: any, config: any) => {
    try {
        // Usuarios cuyo vencimiento es exactamente en 48hs (+/- 1 hora de margen)
        // O más simple: usuarios que vencen el d+2
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 2);
        const dateStr = targetDate.toISOString().split('T')[0];

        const usersToNotify = await db.select({
            id: users.id,
            email: users.email,
            plan: users.plan,
            status: users.subscriptionStatus,
            phone: settings.phone
        })
        .from(users)
        .innerJoin(settings, eq(users.email, settings.userId)) // Ajustado segun estructura existente
        .where(
            and(
                sql`DATE(${users.trialEndsAt}) = ${dateStr}`,
                isNotNull(settings.phone)
            )
        );

        console.log(`📡 [Cron] Procesando ${usersToNotify.length} alertas de 48h...`);

        for (const user of usersToNotify) {
            const nombre = user.email.split('@')[0];
            const message = replaceVariables(config.reminderMessage || "Hola {nombre}, tu plan {plan} vence en 48hs.", {
                nombre,
                plan: user.plan || 'Estandar',
                estado: user.status || 'Activo'
            });

            await sendWhatsAppMessage(user.phone, message);
        }
    } catch (e: any) {
        console.error("❌ Error en processAlert48h:", e.message);
    }
};

const processFinishedTrials = async (db: any, config: any) => {
    try {
        // Usuarios cuyo trial terminó ayer
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - 1);
        const dateStr = targetDate.toISOString().split('T')[0];

        const usersToNotify = await db.select({
            id: users.id,
            email: users.email,
            plan: users.plan,
            status: users.subscriptionStatus,
            phone: settings.phone
        })
        .from(users)
        .innerJoin(settings, eq(users.email, settings.userId))
        .where(
            and(
                sql`DATE(${users.trialEndsAt}) = ${dateStr}`,
                isNotNull(settings.phone)
            )
        );

        console.log(`📡 [Cron] Procesando ${usersToNotify.length} avisos de trial finalizado...`);

        for (const user of usersToNotify) {
            const nombre = user.email.split('@')[0];
            const message = replaceVariables(config.trialEndedMessage || "Tu periodo ha finalizado {nombre}.", {
                nombre,
                plan: user.plan || 'Estandar',
                estado: 'Finalizado'
            });

            await sendWhatsAppMessage(user.phone, message);
        }
    } catch (e: any) {
        console.error("❌ Error en processFinishedTrials:", e.message);
    }
};