import cron from 'node-cron';
import { getDb } from './db.js';
import { users, settings, bot_settings } from './schema.js';
import { eq, sql, and, isNotNull, or, lt, ne } from 'drizzle-orm';
import { sendWhatsAppMessage } from './bot.js';

const ADMIN_PHONES = ['5491138057772', '5491124949533'];

export const startCronJobs = () => {
    console.log("⏰ [Cron] Automatizaciones listas: Diaria (10:00 AM) | Reporte (Lunes 09:00 AM)");

    cron.schedule('0 10 * * *', async () => {
        console.log("🔍 [Cron] Iniciando revisión diaria de suscripciones y avisos...");
        await runBatchAutomation();
    });

    cron.schedule('0 9 * * 1', async () => {
        console.log("📊 [Cron] Generando reporte semanal de métricas...");
        await runWeeklyReport();
    });
};

export const runWeeklyReport = async () => {
    try {
        const db = getDb();
        const allUsers = await db.select().from(users);
        
        const active = allUsers.filter((u: any) => u.subscriptionStatus === 'active');
        const trialing = allUsers.filter((u: any) => u.subscriptionStatus === 'trialing').length;
        const expired = allUsers.filter((u: any) => u.subscriptionStatus === 'expired').length;

        let mrr = 0;
        active.forEach((user: any) => {
            let baseMensual = 0;
            const sucursales = Number(user.sucursalesExtra || 0); 
            const ciclo = user.cicloDePago || 'mensual';
            
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
            `💰 *MRR Estimado:* ${formattedMRR}\n` +
            `👥 *Estado de Base:*\n` +
            `• Activos: ${active.length}\n` +
            `• En Trial: ${trialing}\n` +
            `• Expirados: ${expired}\n\n` +
            `🚀 *¡Buena semana de ventas!*`;

        for (const phone of ADMIN_PHONES) {
            await sendWhatsAppMessage(phone, mensaje);
        }
        console.log("✅ [Cron] Reporte semanal enviado.");

    } catch (error: any) {
        console.error("❌ [Cron] Error en reporte semanal:", error.message);
    }
};

const runBatchAutomation = async () => {
    try {
        const db = getDb();
        // 1. Expira los que vencieron hoy
        await autoExpireUsers(db);

        // 2. Carga configuración del bot
        const configRes = await db.select().from(bot_settings).limit(1);
        if (configRes.length === 0 || !configRes[0].isEnabled) {
            console.log("🛑 [Cron] Automatización omitida: Bot desactivado.");
            return;
        }
        
        const config = configRes[0];
        // 3. Procesar alertas preventivas (36hs antes)
        await processAlert36h(db, config);
        // 4. Procesar avisos de expiración (Trial y Licencia)
        await processExpirations(db, config);
        
    } catch (error: any) {
        console.error("❌ [Cron] Error en ejecución batch:", error.message);
    }
};

const autoExpireUsers = async (db: any) => {
    try {
        const now = new Date();
        await db.update(users)
            .set({ 
                subscriptionStatus: 'expired',
                updatedAt: new Date()
            })
            .where(
                and(
                    ne(users.subscriptionStatus, 'expired'),
                    or(
                        and(ne(users.plan, 'Free'), isNotNull(users.currentPeriodEnd), lt(users.currentPeriodEnd, now)),
                        and(eq(users.plan, 'Free'), isNotNull(users.trialEndsAt), lt(users.trialEndsAt, now))
                    )
                )
            );
        console.log("✅ [Cron] Chequeo de expiraciones finalizado.");
    } catch (e: any) {
        console.error("❌ [Cron] Error en autoExpireUsers:", e.message);
    }
};

const replaceVariables = (template: string, data: any) => {
    if (!template) return "";
    return template
        .replace(/{nombre}/g, data.nombre || "Cliente")
        .replace(/{plan}/g, data.plan || "Estandar")
        .replace(/{estado}/g, data.estado || "Activo");
};

// --- ALERTA PREVENTIVA (36 a 48 hs antes de vencer) ---
const processAlert36h = async (db: any, config: any) => {
    try {
        const targetDate = new Date(Date.now() + (40 * 60 * 60 * 1000)); // Punto medio ~40hs
        const dateStr = targetDate.toISOString().split('T')[0];

        const usersToNotify = await db.select({
            id: users.id,
            email: users.email,
            plan: users.plan,
            phone: settings.phone
        })
        .from(users)
        .innerJoin(settings, eq(users.id, sql`${settings.userId}::uuid`))
        .where(and(
            isNotNull(settings.phone),
            ne(users.subscriptionStatus, 'expired'),
            or(
                sql`DATE(${users.currentPeriodEnd}) = ${dateStr}`, // Alerta Plan Pago
                sql`DATE(${users.trialEndsAt}) = ${dateStr}`      // Alerta Trial
            )
        ));

        for (const user of usersToNotify) {
            const nombre = user.email.split('@')[0];
            const message = replaceVariables(config.reminderMessage, {
                nombre, plan: user.plan, estado: "Próximo a vencer"
            });
            await sendWhatsAppMessage(user.phone, message);
        }
    } catch (e: any) {
        console.error("❌ [Cron] Error en alertas 36h:", e.message);
    }
};

// --- AVISO DE EXPIRACIÓN (Licencia vencida hoy o ayer) ---
const processExpirations = async (db: any, config: any) => {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        const usersToNotify = await db.select({
            id: users.id,
            email: users.email,
            plan: users.plan,
            phone: settings.phone
        })
        .from(users)
        .innerJoin(settings, eq(users.id, sql`${settings.userId}::uuid`))
        .where(and(
            isNotNull(settings.phone),
            or(
                sql`DATE(${users.currentPeriodEnd}) = ${dateStr}`, // Pago vencido ayer
                sql`DATE(${users.trialEndsAt}) = ${dateStr}`      // Trial vencido ayer
            )
        ));

        for (const user of usersToNotify) {
            const nombre = user.email.split('@')[0];
            const message = replaceVariables(config.trialEndedMessage, {
                nombre, 
                plan: user.plan === 'Free' ? 'Prueba' : user.plan, 
                estado: "Vencido"
            });
            await sendWhatsAppMessage(user.phone, message);
        }
    } catch (e: any) {
        console.error("❌ [Cron] Error en avisos de expiración:", e.message);
    }
};