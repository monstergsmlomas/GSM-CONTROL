import {
    Users,
    DollarSign,
    AlertTriangle,
    BarChart3,
    ArrowRight,
    Clock,
    TrendingUp,
    Activity,
    PieChart as PieChartIcon
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
            <div className="flex items-center justify-center h-full text-zinc-500 animate-pulse font-mono">
                {'>'} CARGANDO SISTEMA CENTRAL...
            </div>
        );
    }

    const totalRevenue = logs.reduce((acc, log) => acc + (Number(log.monto) || 0), 0);
    const activeUsersCount = users.filter((u: any) => u.subscriptionStatus === 'active').length;
    const totalUsersCount = users.length;
    
    const recentLogs = [...logs].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5);
    
    const recentUsers = Array.isArray(users) ? [...users].sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.fechaAlta ? new Date(a.fechaAlta).getTime() : 0);
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.fechaAlta ? new Date(b.fechaAlta).getTime() : 0);
        return dateB - dateA;
    }).slice(0, 5) : [];

    const revenueData = [
        { name: 'Ene', total: totalRevenue * 0.2 },
        { name: 'Feb', total: totalRevenue * 0.35 },
        { name: 'Mar', total: totalRevenue * 0.45 },
    ];
    
    const planDistribution = [
        { name: 'Estandar', value: users.filter((u: any) => u.plan === 'Estandar').length },
        { name: 'Multisede', value: users.filter((u: any) => u.plan === 'Multisede').length },
        { name: 'Premium AI', value: users.filter((u: any) => u.plan === 'Premium AI').length },
        { name: 'Trial/Free', value: users.filter((u: any) => u.plan === 'Free' || u.subscriptionStatus === 'trialing').length },
    ];

    const COLORS = ['#fbbf24', '#10b981', '#6366f1', '#71717a'];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Panel de Control</h2>
                    <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mt-1">SISTEMA GSM-FIX V2.0</p>
                </div>
                <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-zinc-500 font-mono uppercase">Status de Red</p>
                    <p className="text-sm text-emerald-400 font-mono flex items-center gap-2 justify-end font-bold">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        SISTEMA ONLINE
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => setCurrentView('users')}
                    className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 relative overflow-hidden group hover:border-indigo-500/50 transition-all text-left w-full shadow-lg"
                >
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={60} /></div>
                   <div className="flex justify-between items-start">
                       <div>
                           <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Suscripciones Activas</p>
                           <h3 className="text-3xl font-black text-white mt-2">{activeUsersCount} <span className="text-lg text-zinc-700 font-normal">/ {totalUsersCount}</span></h3>
                       </div>
                       <div className="bg-indigo-500/10 p-2 rounded-xl text-indigo-400 border border-indigo-500/20"><Users size={20} /></div>
                   </div>
                   <div className="mt-4 flex items-center gap-1 text-[10px] text-indigo-400 font-bold uppercase tracking-tighter group-hover:gap-2 transition-all">
                       Gestionar Usuarios <ArrowRight size={12} />
                   </div>
                </button>

                <button
                    onClick={() => setCurrentView('audit')}
                    className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 relative overflow-hidden group hover:border-emerald-500/50 transition-all text-left w-full shadow-lg"
                >
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign size={60} /></div>
                   <div className="flex justify-between items-start">
                       <div>
                           <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Caja Histórica</p>
                           <h3 className="text-3xl font-black text-white mt-2">${totalRevenue.toLocaleString()}</h3>
                       </div>
                       <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 border border-emerald-500/20"><TrendingUp size={20} /></div>
                   </div>
                   <div className="mt-4 flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-tighter group-hover:gap-2 transition-all">
                       Ver Auditoría <ArrowRight size={12} />
                   </div>
                </button>

                <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 relative overflow-hidden group hover:border-amber-500/50 transition-all shadow-lg">
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><AlertTriangle size={60} /></div>
                   <div className="flex justify-between items-start">
                       <div>
                           <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Estado del Bot</p>
                           <h3 className="text-3xl font-black text-white mt-2">100%</h3>
                       </div>
                       <div className="bg-amber-500/10 p-2 rounded-xl text-amber-500 border border-amber-500/20"><Activity size={20} /></div>
                   </div>
                   <p className="mt-4 text-[10px] text-emerald-500 font-bold uppercase tracking-widest animate-pulse">Sincronización Activa</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
                    <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/40">
                        <h3 className="font-bold text-sm text-white flex items-center gap-2 uppercase tracking-tight">
                            <Activity size={16} className="text-emerald-500"/> Registro de Movimientos
                        </h3>
                        <button onClick={() => setCurrentView('audit')} className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">Historial Completo</button>
                    </div>
                    <div className="flex-1 overflow-auto max-h-[350px]">
                        <table className="w-full text-left text-sm">
                            <tbody className="divide-y divide-zinc-800/50">
                                {recentLogs.length > 0 ? recentLogs.map(log => (
                                    <tr key={log.id} className="group hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="text-zinc-200 font-bold text-xs uppercase">{log.accion}</div>
                                                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{log.detalle}</div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="text-emerald-400 font-mono font-bold">{"+$" + (Number(log.monto) || 0).toLocaleString()}</div>
                                                <div className="text-[9px] text-zinc-600 flex items-center justify-end gap-1 mt-1 font-mono uppercase">
                                                    <Clock size={10} />
                                                    {new Date(log.fecha).toLocaleDateString()}
                                                </div>
                                            </td>
                                    </tr>
                                )) : (
                                    <tr><td className="p-12 text-center text-zinc-600 italic font-mono text-xs uppercase tracking-widest">Sin datos de auditoría</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
                    <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/40">
                        <h3 className="font-bold text-sm text-white flex items-center gap-2 uppercase tracking-tight">
                            <Users size={16} className="text-indigo-500"/> Actividad de Clientes
                        </h3>
                        <button onClick={() => setCurrentView('users')} className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">Ver todos</button>
                    </div>
                    <div className="flex-1 overflow-auto max-h-[350px]">
                        <table className="w-full text-left text-sm">
                            <tbody className="divide-y divide-zinc-800/50">
                                {recentUsers.map(user => (
                                    <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-black text-indigo-400 border border-zinc-700 uppercase">
                                                        {(user.nombre || 'U').substring(0,2)}
                                                    </div>
                                                    <div>
                                                        <div className="text-zinc-200 font-bold text-xs uppercase tracking-tight">{user.nombre}</div>
                                                        <div className="text-[10px] text-zinc-500 font-mono">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                                    user.subscriptionStatus === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    user.subscriptionStatus === 'trialing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    user.subscriptionStatus === 'expired' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-white text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                        <TrendingUp size={16} className="text-emerald-500"/> Tendencia de Ventas
                    </h3>
                    <div style={{ height: '280px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                                <XAxis dataKey="name" stroke="#52525b" tickLine={false} axisLine={false} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                                <YAxis stroke="#52525b" tickLine={false} axisLine={false} style={{ fontSize: '10px', fontWeight: 'bold' }} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '12px', border: '1px solid #3f3f46' }}
                                    cursor={{fill: '#18181b'}}
                                />
                                <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} barSize={45} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-white text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                        <PieChartIcon size={16} className="text-indigo-500"/> Segmentación por Producto
                    </h3>
                    <div style={{ height: '280px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={planDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={95}
                                    paddingAngle={8}
                                    dataKey="value"
                                    animationBegin={200}
                                >
                                    {planDistribution.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '12px', border: '1px solid #3f3f46' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#71717a' }} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}