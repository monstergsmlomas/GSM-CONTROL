import { getDb } from './db.js';
import { users } from './schema.js';
import { sendWhatsAppMessage } from './bot.js';

export const sendWeeklyReport = async (adminPhone: string) => {
    try {
        const db = getDb();
        const allUsers = await db.select().from(users);
        
        const active = allUsers.filter((u: any) => u.subscriptionStatus === 'active');
        const trialing = allUsers.filter((u: any) => u.subscriptionStatus === 'trialing').length;
        const expired = allUsers.filter((u: any) => u.subscriptionStatus === 'expired').length;

        // Cálculo rápido de MRR (siguiendo tu lógica de Metricas.tsx)
        let mrr = 0;
        active.forEach((user: any) => {
            let base = 0;
            const sucursales = user.sucursales_extra || 0;
            
            if (user.plan === 'Estandar' || user.plan === 'Multisede') {
                if (user.ciclo_de_pago === 'semestral') base = 160000 / 6;
                else if (user.ciclo_de_pago === 'anual') base = 300000 / 12;
                else base = 30000;
                
                if (user.plan === 'Multisede') base += sucursales * 10000;
            }
            mrr += base;
        });

        const formattedMRR = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(mrr);

        const mensaje = `📈 *REPORTE SEMANAL GSM-CONTROL*\n\n` +
            `💰 *MRR Actual:* ${formattedMRR}\n` +
            `👥 *Usuarios:* ${active.length} Activos, ${trialing} Trial, ${expired} Expirados.\n\n` +
            `🚀 ¡Que tengas una excelente semana de ventas, Rodrigo!`;

        await sendWhatsAppMessage(adminPhone, mensaje);
        console.log('✅ Reporte semanal enviado con éxito.');
    } catch (error) {
        console.error('❌ Error enviando reporte semanal:', error);
    }
};