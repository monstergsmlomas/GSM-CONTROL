import {
    Users,
    DollarSign,
    AlertTriangle,
    BarChart3,
    PieChart,
    ArrowRight,
    Clock,
    TrendingUp,
    Activity
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';
import type { DashboardUser, AuditLog } from '../types';

interface DashboardProps {
    users: DashboardUser[];
    logs: AuditLog[];
    isLoading: boolean;
    setCurrentView: (view: string) => void;
}

export default function Dashboard({ users, logs, isLoading, setCurrentView }: DashboardProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full text-zinc-500 animate-pulse">
                Cargando panel de control...
            </div>
        );
    }

    const totalRevenue = logs.reduce((acc, log) => acc + (log.monto || 0), 0);
    const activeUsersFromMetrics = users.filter(u => u.subscriptionStatus === 'active').length;
    const totalUsersFromMetrics = users.length;
   
    const recentLogs = [...logs].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5);
    const recentUsers = Array.isArray(users) ? [...users].sort((a, b) => {
        const dateA = a.fechaAlta ? new Date(a.fechaAlta).getTime() : 0;
        const dateB = b.fechaAlta ? new Date(b.fechaAlta).getTime() : 0;
        return dateB - dateA;
    }).slice(0, 5) : [];

    const revenueData = [
        { name: 'Ene', total: totalRevenue * 0.2 },
        { name: 'Feb', total: totalRevenue * 0.35 },
        { name: 'Mar', total: totalRevenue * 0.45 },
    ];
   
    const planDistribution = [
        { name: 'Estandar', value: users.filter(u => u.plan === 'Estandar').length },
        { name: 'Multisede', value: users.filter(u => u.plan === 'Multisede').length },
        { name: 'Premium AI', value: users.filter(u => u.plan === 'Premium AI').length },
        { name: 'Free', value: users.filter(u => u.plan === 'Free' || u.subscriptionStatus === 'trialing').length },
    ];

    const COLORS = ['#fbbf24', '#10b981', '#3b82f6', '#71717a'];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-white">Panel Principal</h2>
                    <p className="text-zinc-400 text-sm">Resumen general de GSM-FIX</p>
                </div>
                <div className="text-right hidden sm:block">
                    <p className="text-xs text-zinc-500 font-mono">Última actualización</p>
                    <p className="text-sm text-emerald-400 font-mono flex items-center gap-1 justify-end">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        En tiempo real
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => setCurrentView('users')}
                    className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/50 transition-all text-left w-full"
                >
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={60} /></div>
                   <div className="flex justify-between items-start">
                       <div>
                           <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Usuarios Activos</p>
                           <h3 className="text-3xl font-bold text-white mt-2">{activeUsersFromMetrics} <span className="text-lg text-zinc-600 font-normal">/ {totalUsersFromMetrics}</span></h3>
                       </div>
                       <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400"><Users size={20} /></div>
                   </div>
                   <div className="mt-4 flex items-center gap-1 text-xs text-indigo-400 font-medium group-hover:underline cursor-pointer">
                       Ver gestión de usuarios <ArrowRight size={12} />
                   </div>
                </button>

                <button
                    onClick={() => setCurrentView('audit')}
                    className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition-all text-left w-full"
                >
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign size={60} /></div>
                   <div className="flex justify-between items-start">
                       <div>
                           <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Ingresos Totales</p>
                           <h3 className="text-3xl font-bold text-white mt-2">${totalRevenue.toLocaleString()}</h3>
                       </div>
                       <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400"><TrendingUp size={20} /></div>
                   </div>
                   <div className="mt-4 flex items-center gap-1 text-xs text-emerald-400 font-medium group-hover:underline cursor-pointer">
                       Ver flujo de caja <ArrowRight size={12} />
                   </div>
                </button>

                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden group hover:border-amber-500/50 transition-colors">
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><AlertTriangle size={60} /></div>
                   <div className="flex justify-between items-start">
                       <div>
                           <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Alertas del Sistema</p>
                           <h3 className="text-3xl font-bold text-white mt-2">0</h3>
                       </div>
                       <div className="bg-amber-500/10 p-2 rounded-lg text-amber-500"><AlertTriangle size={20} /></div>
                   </div>
                   <p className="mt-4 text-xs text-zinc-500">Todo funcionando correctamente.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/30">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Activity size={18} className="text-emerald-500"/> Últimos Movimientos
                        </h3>
                        <button onClick={() => setCurrentView('audit')} className="text-xs text-zinc-400 hover:text-white transition-colors">Ver todo</button>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-sm">
                            <tbody className="divide-y divide-zinc-800/50">
                                {recentLogs.length > 0 ? recentLogs.map(log => (
                                    <tr key={log.id} className="group hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="text-zinc-200 font-medium">{log.accion}</div>
                                                <div className="text-xs text-zinc-500">{log.detalle}</div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="text-emerald-400 font-mono font-medium">+${(log.monto || 0).toLocaleString()}</div>
                                                <div className="text-xs text-zinc-600 flex items-center justify-end gap-1">
                                                    <Clock size={10} />
                                                    {new Date(log.fecha).toLocaleDateString()}
                                                </div>
                                            </td>
                                    </tr>
                                )) : (
                                    <tr><td className="p-8 text-center text-zinc-500 italic">Sin movimientos recientes</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/30">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Users size={18} className="text-indigo-500"/> Nuevos Usuarios
                        </h3>
                        <button onClick={() => setCurrentView('users')} className="text-xs text-zinc-400 hover:text-white transition-colors">Gestionar</button>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-sm">
                            <tbody className="divide-y divide-zinc-800/50">
                                {recentUsers.map(user => (
                                    <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 border border-zinc-700">
                                                        {user.nombre.substring(0,2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-zinc-200 font-medium">{user.nombre}</div>
                                                        <div className="text-xs text-zinc-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={`px-2 py-1 rounded text-xs font-medium border ${
                                                    user.subscriptionStatus === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    user.subscriptionStatus === 'trialing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    user.subscriptionStatus === 'expired' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                    'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                }`}>
                                                    {user.subscriptionStatus}
                                                </span>
                                            </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                        <BarChart3 size={18} className="text-zinc-500"/> Tendencia de Ingresos
                    </h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="name" stroke="#71717a" tickLine={false} axisLine={false} />
                                <YAxis stroke="#71717a" tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
                                    cursor={{fill: '#27272a'}}
                                />
                                <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                        <PieChart size={18} className="text-zinc-500"/> Distribución de Planes
                    </h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <RePieChart>
                                <Pie
                                    data={planDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationBegin={400}
                                >
                                    {planDistribution.map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}