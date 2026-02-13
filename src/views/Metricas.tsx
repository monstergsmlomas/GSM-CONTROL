import {
    Zap,
    BarChart3,
    PieChart,
    Users,
    Activity,
    ShieldCheck,
    Clock,
    CreditCard
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

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#71717a'];

interface MetricsPanelProps {
    users: DashboardUser[];
}

const MetricsPanel = ({ users }: MetricsPanelProps) => {

    // --- 1. ESTADÍSTICAS DINÁMICAS ---
    const totalUsers = users.length;

    // Distribución de Estados (Basada en Esquema Real)
    const activeUsers = users.filter(u => u.subscriptionStatus === 'active').length;
    const trialingUsers = users.filter(u => u.subscriptionStatus === 'trialing').length;
    const expiredUsers = users.filter(u => u.subscriptionStatus === 'expired').length;

    // Gráfico de Distribución Real
    const statusDistribution = [
        { name: 'Activos', value: activeUsers },
        { name: 'En Trial', value: trialingUsers },
        { name: 'Expirados', value: expiredUsers },
    ];

    // Placeholder for totalIncome, as it's used in the new MetricCard but not calculated here.
    // You would need to calculate this based on your user data.
    const totalIncome = 0; // Replace with actual calculation

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <PieChart className="text-indigo-500" />
                    Panel de Control de Usuarios
                </h2>
                <p className="text-zinc-400 font-mono text-sm mt-1 opacity-80">{'>'} Estado de suscripciones y métricas de salud.</p>
            </div>

            {/* KPI CARDS (Resumen rápido) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Base</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{totalUsers} Usuarios</h3>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl border-l-emerald-500/50">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Activos</p>
                    <h3 className="text-2xl font-bold text-emerald-400 mt-1">{activeUsers}</h3>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl border-l-amber-500/50">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">En Periodo de Prueba</p>
                    <h3 className="text-2xl font-bold text-amber-400 mt-1">{trialingUsers}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* NUEVO: Gráfico de Estados (Trial vs Activos) */}
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
                                    <Cell fill="#10b981" /> {/* Esmeralda para Activos */}
                                    <Cell fill="#f59e0b" /> {/* Ámbar para Trial */}
                                    <Cell fill="#ef4444" /> {/* Rojo para Expirados (added based on statusDistribution) */}
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

                {/* Distribución de Planes (Existente) - MODIFIED TO USE statusDistribution */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Users size={18} className="text-indigo-500" /> Distribución por Plan
                    </h3>
                    <div className="h-64 mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={statusDistribution} // Changed from userDistribution to statusDistribution
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationBegin={400}
                                >
                                    {statusDistribution.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MetricsPanel;