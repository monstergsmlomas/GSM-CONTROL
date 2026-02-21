import {
    Zap,
    BarChart3,
    PieChart as PieChartIcon,
    Users,
    Activity,
    ShieldCheck,
    Clock,
    CreditCard,
    TrendingUp,
    Target
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

// Colores con efecto Neón
const STATUS_COLORS = ['#10b981', '#f59e0b', '#ef4444']; 
const PLAN_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#71717a']; 

interface MetricsPanelProps {
    users: DashboardUser[];
    mrrTarget: number;
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

    const progressPercentage = mrrTarget > 0 ? Math.min((calculatedMRR / mrrTarget) * 100, 100) : 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <BarChart3 className="text-indigo-500" />
                        Métricas de Crecimiento
                    </h2>
                    <p className="text-zinc-400 font-mono text-xs mt-1 opacity-80 uppercase tracking-widest">
                        {'>'} Análisis de rendimiento gsm-fix
                    </p>
                </div>
            </div>

            {/* TARJETA FINANCIERA (EFECTO GLASSMORFISMO) */}
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-indigo-500/20 p-6 rounded-3xl relative overflow-hidden shadow-[0_0_50px_-12px_rgba(99,102,241,0.2)]">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <TrendingUp size={120} className="text-indigo-400" />
                </div>
                
                <div className="flex flex-col md:flex-row justify-between items-start relative z-10 gap-6">
                    <div className="space-y-2">
                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <CreditCard size={14} /> Mensual Recurrente (MRR)
                        </p>
                        <div className="flex items-baseline gap-3">
                            <h3 className="text-5xl md:text-6xl font-mono font-black text-white drop-shadow-sm">
                                {formattedMRR}
                            </h3>
                            <span className="text-zinc-600 text-xs font-bold uppercase tracking-tighter">ARS / Mes</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono bg-black/20 w-fit px-3 py-1 rounded-full border border-white/5">
                            <Users size={12} className="text-indigo-500/50" />
                            Soportado por {activePayingUsers} clientes de pago
                        </div>
                    </div>

                    <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 min-w-[200px]">
                        <p className="text-emerald-500/70 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-1">
                            <Target size={14} /> Meta Mensual
                        </p>
                        <p className="text-2xl font-mono font-bold text-zinc-200">{formattedTarget}</p>
                    </div>
                </div>

                {/* BARRA DE PROGRESO ANIMADA */}
                <div className="mt-8 relative z-10">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                        <span className="text-indigo-400 flex items-center gap-2">
                            <Zap size={12} className="animate-pulse" />
                            Eficiencia: {progressPercentage.toFixed(1)}%
                        </span>
                        <span className="text-zinc-500">Faltan {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Math.max(mrrTarget - calculatedMRR, 0))}</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-4 rounded-full p-1 border border-zinc-800/50 shadow-inner">
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-600 via-violet-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* GRILLA DE GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* GRÁFICO 1: ESTADO */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Activity size={18} className="text-emerald-500" /> Salud de Clientes
                        </h3>
                        <div className="text-[10px] font-mono text-zinc-500 px-2 py-1 bg-zinc-950 rounded border border-zinc-800">DISTRIBUCIÓN</div>
                    </div>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={statusDistribution}
                                    cx="50%" cy="50%"
                                    innerRadius={75} outerRadius={100}
                                    paddingAngle={10}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={6}
                                >
                                    {statusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    formatter={(value) => <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{value}</span>}
                                />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* GRÁFICO 2: PLANES */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Users size={18} className="text-indigo-500" /> Mix de Productos
                        </h3>
                        <div className="text-[10px] font-mono text-zinc-500 px-2 py-1 bg-zinc-950 rounded border border-zinc-800">MODALIDAD</div>
                    </div>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={planDistribution}
                                    cx="50%" cy="50%"
                                    innerRadius={0} outerRadius={90}
                                    dataKey="value"
                                    stroke="#09090b"
                                    strokeWidth={4}
                                >
                                    {planDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PLAN_COLORS[index % PLAN_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px' }}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    formatter={(value) => <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{value}</span>}
                                />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* MINI CARDS FINALES (ESTADÍSTICAS RÁPIDAS) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-2xl">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Total Clientes</p>
                    <p className="text-xl font-mono font-bold text-white">{totalUsers}</p>
                </div>
                <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-2xl">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Ticket Promedio</p>
                    <p className="text-xl font-mono font-bold text-indigo-400">
                        {activePayingUsers > 0 ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(calculatedMRR / activePayingUsers) : '$0'}
                    </p>
                </div>
                <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-2xl">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Tasa de Trial</p>
                    <p className="text-xl font-mono font-bold text-amber-500">
                        {totalUsers > 0 ? ((trialingUsers / totalUsers) * 100).toFixed(0) : 0}%
                    </p>
                </div>
                <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-2xl">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Crecimiento</p>
                    <p className="text-xl font-mono font-bold text-emerald-500">+12%</p>
                </div>
            </div>
        </div>
    );
};

export default MetricsPanel;