
import { PieChart, DollarSign, X, Users, Activity, ShieldAlert, Save } from 'lucide-react';
import type { AuditLog, DashboardUser } from '../types';

interface MonthlyClosingModalProps {
    isOpen: boolean;
    onClose: () => void;
    month: number;
    year: number;
    logs: AuditLog[];
    users: DashboardUser[];
}

const MonthlyClosingModal = ({ isOpen, onClose, month, year, logs, users }: MonthlyClosingModalProps) => {
    if (!isOpen) return null;

    const monthName = new Date(year, month).toLocaleString('es-ES', { month: 'long' });
    
    // Calculate Monthly Stats
    const monthlyLogs = logs.filter(l => {
        const d = new Date(l.fecha);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    const grossRevenue = monthlyLogs
        .reduce((sum, l) => sum + (l.monto || 0), 0);

    const newSubs = monthlyLogs.filter(l => l.accion.toLowerCase().includes('nuevo') || l.accion.toLowerCase().includes('cambio')).length;
    
    // Top Activity User
    const userActivity: Record<string, number> = {};
    monthlyLogs.forEach(l => { userActivity[l.responsable] = (userActivity[l.responsable] || 0) + 1; });
    const topUser = Object.entries(userActivity).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    const blockedUsers = users.filter(u => u.estado === 'Inactivo').length;
    const partners = ['Admin', 'Socio A', 'Socio B'];
    const sharePerPartner = grossRevenue / partners.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
                    <PieChart size={120} className="text-emerald-500" />
                </div>

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                             <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                                <DollarSign className="text-emerald-400" size={32} />
                                Cierre Mensual: <span className="capitalize text-emerald-400">{monthName} {year}</span>
                             </h2>
                             <p className="text-zinc-400 mt-2">Resumen financiero y operativo del periodo.</p>
                        </div>
                        <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors">
                            <X size={24} className="text-zinc-400" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="bg-zinc-950/50 p-6 rounded-xl border border-zinc-800">
                            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Ingresos Brutos</p>
                            <h3 className="text-4xl font-bold text-white mt-2">${grossRevenue.toFixed(2)}</h3>
                        </div>
                        <div className="bg-zinc-950/50 p-6 rounded-xl border border-zinc-800">
                             <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Participación por Socio</p>
                             <h3 className="text-4xl font-bold text-emerald-400 mt-2">${sharePerPartner.toFixed(2)}</h3>
                             <p className="text-xs text-zinc-500 mt-1">{partners.length} Socios activos</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                         <div className="bg-zinc-800/30 p-4 rounded-lg border border-zinc-700/50">
                             <div className="flex items-center gap-2 mb-2">
                                 <Users className="text-indigo-400" size={16} />
                                 <span className="text-sm font-medium text-zinc-300">Nuevas Subs</span>
                             </div>
                             <span className="text-2xl font-bold text-white">{newSubs}</span>
                         </div>
                         <div className="bg-zinc-800/30 p-4 rounded-lg border border-zinc-700/50">
                             <div className="flex items-center gap-2 mb-2">
                                 <Activity className="text-amber-400" size={16} />
                                 <span className="text-sm font-medium text-zinc-300">Top Actividad</span>
                             </div>
                             <span className="text-xl font-bold text-white truncate">{topUser}</span>
                         </div>
                         <div className="bg-zinc-800/30 p-4 rounded-lg border border-zinc-700/50">
                             <div className="flex items-center gap-2 mb-2">
                                 <ShieldAlert className="text-rose-400" size={16} />
                                 <span className="text-sm font-medium text-zinc-300">Bloqueados Fin Mes</span>
                             </div>
                             <span className="text-2xl font-bold text-white">{blockedUsers}</span>
                         </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-6 py-3 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
                            Cerrar Vista
                        </button>
                        <button className="px-6 py-3 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all">
                             <Save size={18} />
                             Exportar PDF Oficial
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonthlyClosingModal;
