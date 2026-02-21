import cron from 'node-cron';
import { getDb } from './db.js';
import { users, settings, bot_settings } from './schema.js';
import { eq, sql, and, isNotNull } from 'drizzle-orm';
import { sendWhatsAppMessage } from './bot.js';

// Configuración de destinatarios del reporte
const ADMIN_PHONES = ['5491138057772', '5491124949533'];

export const startCronJobs = () => {
    console.log("⏰ [Cron] Configurando automatizaciones (Diaria 10:00 AM | Reporte Lunes 09:00 AM)...");

    // 1. Revisión diaria de vencimientos (10:00 AM)
    cron.schedule('0 10 * * *', async () => {
        console.log("🔍 [Cron] Iniciando revisión diaria de suscripciones...");
        await runBatchAutomation();
    });

    // 2. Reporte Semanal para Socios (Lunes 09:00 AM)
    cron.schedule('0 9 * * 1', async () => {
        console.log("📊 [Cron] Generando reporte semanal de métricas...");
        await runWeeklyReport();
    });
};

// AGREGAMOS 'export' para que index.ts pueda usarla en la ruta manual
export const runWeeklyReport = async () => {
    try {
        const db = getDb();
        const allUsers = await db.select().from(users);
        
        const active = allUsers.filter((u: any) => u.subscriptionStatus === 'active');
        const trialing = allUsers.filter((u: any) => u.subscriptionStatus === 'trialing').length;
        const expired = allUsers.filter((u: any) => u.subscriptionStatus === 'expired').length;

        // --- LÓGICA DE MRR ---
        let mrr = 0;
        active.forEach((user: any) => {
            let baseMensual = 0;
            // IMPORTANTE: Aseguramos compatibilidad con nombres de la DB
            const sucursales = user.sucursales_extra || user.sucursalesExtra || 0; 
            const ciclo = user.ciclo_de_pago || user.cicloDePago || 'mensual';
            
            if (user.plan === 'Estandar' || user.plan === 'Multisede') {
                if (ciclo === 'semestral') baseMensual = 160000 / 6;
                else if (ciclo === 'anual') baseMensual = 300000 / 12;
                else baseMensual = 30000;
                
                if (user.plan === 'Multisede') baseMensual += sucursales * 10000;
            }
            mrr += baseMensual;
        });

        const formattedMRR = new Intl.NumberFormat('es-AR', { 
            style: 'currency', currency: 'ARS', maximumFractionDigits: 0 
        }).format(mrr);

        const mensaje = `📈 *REPORTE SEMANAL GSM-CONTROL*\n\n` +
            `💰 *MRR Actual:* ${formattedMRR}\n` +
            `👥 *Estado de Base:*\n` +
            `• Activos: ${active.length}\n` +
            `• En Trial: ${trialing}\n` +
            `• Expirados: ${expired}\n\n` +
            `🚀 *¡Buena semana de ventas, Rodrigo y Tomy!*`;

        // Envío a ambos números
        for (const phone of ADMIN_PHONES) {
            await sendWhatsAppMessage(phone, mensaje);
        }
        console.log("✅ [Cron] Reporte semanal enviado a los socios.");

    } catch (error: any) {
        console.error("❌ [Cron] Error en reporte semanal:", error.message);
    }
};

const runBatchAutomation = async () => {
    try {
        const db = getDb();
        const configRes = await db.select().from(bot_settings).limit(1);
        if (configRes.length === 0 || !configRes[0].isEnabled) {
            console.log("🛑 [Cron] Automatización cancelada: Bot desactivado.");
            return;
        }
        const config = configRes[0];
        await processAlert48h(db, config);
        await processFinishedTrials(db, config);
    } catch (error: any) {
        console.error("❌ [Cron] Error en ejecución batch:", error.message);
    }
};

const replaceVariables = (template: string, { nombre, plan, estado }: { nombre: string, plan: string, estado: string }) => {
    return template
        .replace(/{nombre}/g, nombre)
        .replace(/{plan}/g, plan)
        .replace(/{estado}/g, estado);
};

const processAlert48h = async (db: any, config: any) => {
    try {
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
        .innerJoin(settings, eq(users.email, settings.userId))
        .where(and(sql`DATE(${users.currentPeriodEnd}) = ${dateStr}`, isNotNull(settings.phone)));

        for (const user of usersToNotify) {
            const nombre = user.email.split('@')[0];
            const message = replaceVariables(config.reminderMessage || "Hola {nombre}, tu plan {plan} vence en 48hs.", {
                nombre, plan: user.plan || 'Estandar', estado: user.status || 'Activo'
            });
            await sendWhatsAppMessage(user.phone, message);
        }
    } catch (e: any) {
        console.error("❌ Error en processAlert48h:", e.message);
    }
};

const processFinishedTrials = async (db: any, config: any) => {
    try {
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
        .where(and(sql`DATE(${users.trialEndsAt}) = ${dateStr}`, isNotNull(settings.phone)));

        for (const user of usersToNotify) {
            const nombre = user.email.split('@')[0];
            const message = replaceVariables(config.trialEndedMessage || "Tu periodo ha finalizado {nombre}.", {
                nombre, plan: user.plan || 'Estandar', estado: 'Finalizado'
            });
            await sendWhatsAppMessage(user.phone, message);
        }
    } catch (e: any) {
        console.error("❌ Error en processFinishedTrials:", e.message);
    }
};