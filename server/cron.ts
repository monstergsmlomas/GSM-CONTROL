import cron from 'node-cron';
import { getDb } from './db';
import { users, settings } from './schema';
import { eq, sql, and } from 'drizzle-orm';
import { sendWhatsAppMessage } from './bot';

export const initCronJobs = () => {
    console.log("⏰ [Cron] Programando tareas diarias...");

    // Tarea diaria a las 09:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log("🔍 [Cron] Ejecutando revisión diaria de suscripciones...");
        await checkExpirations();
        await checkTrialEnds();
    });

    // Tarea de prueba opcional (cada hora para debug en logs si se desea)
    // cron.schedule('0 * * * *', () => console.log("💓 [Cron] Servidor activo y monitoreando..."));
};

const checkExpirations = async () => {
    try {
        const db = getDb();
        
        // Buscar usuarios que expiran en exactamente 48 horas
        // Comparamos la fecha actual + 2 días con currentPeriodEnd
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 2);
        const dateString = targetDate.toISOString().split('T')[0];

        const usersToNotify = await db.select({
            user: users,
            phone: settings.phone
        })
        .from(users)
        .innerJoin(settings, eq(users.id, settings.userId))
        .where(
            sql`DATE(${users.currentPeriodEnd}) = ${dateString}`
        );

        for (const item of usersToNotify) {
            if (item.phone) {
                const message = `⚠️ *GSM-FIX AVISO*: Hola! Tu suscripción expira en 48hs. No olvides renovar para seguir disfrutando del servicio.`;
                await sendWhatsAppMessage(item.phone, message);
            }
        }
    } catch (error) {
        console.error("❌ [Cron] Error en checkExpirations:", error);
    }
};

const checkTrialEnds = async () => {
    try {
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];

        // Usuarios cuyo periodo de prueba termina hoy
        const trialsEnding = await db.select({
            user: users,
            phone: settings.phone
        })
        .from(users)
        .innerJoin(settings, eq(users.id, settings.userId))
        .where(
            and(
                sql`DATE(${users.trialEndsAt}) = ${today}`,
                eq(users.subscriptionStatus, 'expired')
            )
        );

        for (const item of trialsEnding) {
            if (item.phone) {
                const message = `🎁 *GSM-FIX*: Hola! Tu periodo de prueba ha finalizado. Esperamos que te haya gustado! Podés contratar un plan para seguir gestionando tu taller.`;
                await sendWhatsAppMessage(item.phone, message);
            }
        }
    } catch (error) {
        console.error("❌ [Cron] Error en checkTrialEnds:", error);
    }
};

export default { initCronJobs };
