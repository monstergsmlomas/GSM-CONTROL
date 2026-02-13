import {
    Zap,
    BarChart3,
    PieChart as PieChartIcon, // Renombrado para no chocar con recharts
    Users,
    Activity,
    ShieldCheck,
    Clock,
    CreditCard,
    TrendingUp,
    Target // NUEVO ICONO
} from 'lucide-react';
import {
    PieChart as RePieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import type { DashboardUser } from '../types';

const STATUS_COLORS = ['#10b981', '#f59e0b', '#ef4444']; 
const PLAN_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#71717a']; 

interface MetricsPanelProps {
    users: DashboardUser[];
    mrrTarget: number; // NUEVA PROP
}

const MetricsPanel = ({ users, mrrTarget }: MetricsPanelProps) => {

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.subscriptionStatus === 'active').length;
    const trialingUsers = users.filter(u => u.subscriptionStatus === 'trialing').length;
    const expiredUsers = users.filter(u => u.subscriptionStatus === 'expired').length;

    const statusDistribution = [
        { name: 'Activos', value: activeUsers },
        { name: 'En Trial', value: trialingUsers },
        { name: 'Expirados', value: expiredUsers },
    ];

    const planCounts = users.reduce((acc, user) => {
        const plan = user.plan || 'Free';
        acc[plan] = (acc[plan] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const planDistribution = Object.keys(planCounts).map(key => ({
        name: key,
        value: planCounts[key]
    }));

    // --- CÁLCULO FINANCIERO EXACTO (MRR) ---
    let calculatedMRR = 0;
    let activePayingUsers = 0;

    users.forEach(user => {
        if (user.subscriptionStatus === 'active') {
            let baseMensual = 0;
            const sucursales = user.sucursalesExtra || 0;
            const costoSucursales = sucursales * 10000;

            if (user.plan === 'Estandar' || user.plan === 'Multisede') {
                activePayingUsers++;
                
                if (user.cicloDePago === 'semestral') {
                    baseMensual = 160000 / 6;
                } else if (user.cicloDePago === 'anual') {
                    baseMensual = 300000 / 12;
                } else {
                    baseMensual = 30000; 
                }

                if (user.plan === 'Multisede') {
                    baseMensual += costoSucursales;
                }
            }
            calculatedMRR += baseMensual;
        }
    });
    
    const formattedMRR = new Intl.NumberFormat('es-AR', { 
        style: 'currency', 
        currency: 'ARS', 
        maximumFractionDigits: 0 
    }).format(calculatedMRR);

    const formattedTarget = new Intl.NumberFormat('es-AR', { 
        style: 'currency', 
        currency: 'ARS', 
        maximumFractionDigits: 0 
    }).format(mrrTarget);

    // CALCULAR PORCENTAJE DE LA BARRA DE PROGRESO
    const progressPercentage = mrrTarget > 0 ? Math.min((calculatedMRR / mrrTarget) * 100, 100) : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <PieChartIcon className="text-indigo-500" />
                        Panel de Control de Usuarios
                    </h2>
                    <p className="text-zinc-400 font-mono text-sm mt-1 opacity-80">{'>'} Estado de suscripciones y salud financiera.</p>
                </div>
            </div>

            {/* TARJETA FINANCIERA PRINCIPAL */}
            <div className="bg-zinc-900 border border-indigo-500/30 p-6 rounded-2xl ring-1 ring-indigo-500/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <TrendingUp size={100} className="text-indigo-500" />
                </div>
                
                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <CreditCard size={14} /> Ingreso Mensual Recurrente (MRR Exacto)
                        </p>
                        <div className="flex items-baseline gap-2 mt-2">
                            <h3 className="text-4xl md:text-5xl font-mono font-bold text-white">{formattedMRR}</h3>
                            <span className="text-zinc-500 text-sm font-bold uppercase">ARS / Mes</span>
                        </div>
                        <p className="text-zinc-500 text-[10px] mt-2 font-mono max-w-lg">
                            *Basado en {activePayingUsers} usuarios activos. Los pagos semestrales/anuales se dividen proporcionalmente. Incluye extra por sucursales.
                        </p>
                    </div>

                    <div className="text-right hidden md:block">
                        <p className="text-emerald-500/70 text-xs font-bold uppercase tracking-widest flex items-center justify-end gap-1 mb-1">
                            <Target size={12} /> Meta Actual
                        </p>
                        <p className="text-xl font-mono font-bold text-zinc-300">{formattedTarget}</p>
                    </div>
                </div>

                {/* BARRA DE PROGRESO DE LA META */}
                <div className="mt-8 relative z-10">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-2">
                        <span className="text-indigo-400">Progreso: {progressPercentage.toFixed(1)}%</span>
                        <span className="text-zinc-500 md:hidden">Meta: {formattedTarget}</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden border border-zinc-800">
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Base</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{totalUsers}</h3>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl border-l-emerald-500/50">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Activos</p>
                    <h3 className="text-2xl font-bold text-emerald-400 mt-1">{activeUsers}</h3>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl border-l-amber-500/50">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">En Trial</p>
                    <h3 className="text-2xl font-bold text-amber-400 mt-1">{trialingUsers}</h3>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl border-l-rose-500/50">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Expirados</p>
                    <h3 className="text-2xl font-bold text-rose-500 mt-1">{expiredUsers}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Activity size={18} className="text-emerald-500" /> Estado de Suscripciones
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={statusDistribution}
                                    cx="50%" cy="50%"
                                    innerRadius={70} outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {statusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Users size={18} className="text-indigo-500" /> Distribución por Plan
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={planDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {planDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PLAN_COLORS[index % PLAN_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MetricsPanel;