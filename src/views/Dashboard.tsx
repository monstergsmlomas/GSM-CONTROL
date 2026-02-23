import { useState, useEffect } from 'react';
import {
    Users,
    DollarSign,
    AlertTriangle,
    BarChart3,
    ArrowRight,
    Clock,
    TrendingUp,
    Activity,
    PieChart as PieChartIcon,
    RefreshCw,
    ExternalLink, // Icono nuevo para el enlace
    QrCode
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
    // NUEVO ESTADO: Ahora incluye qr y qrLink
    const [botState, setBotState] = useState({ 
        status: 'loading', 
        isReady: false, 
        qr: null as string | null,
        qrLink: null as string | null 
    });

    useEffect(() => {
        const fetchBotStatus = async () => {
            try {
                const res = await fetch('/api/bot-status');
                if (res.ok) {
                    const data = await res.json();
                    setBotState(data);
                }
            } catch (e) {
                setBotState(prev => ({ ...prev, status: 'disconnected', isReady: false }));
            }
        };
        fetchBotStatus();
        const interval = setInterval(fetchBotStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const getBotUI = () => {
        switch(botState.status) {
            case 'connected':
                return {
                    border: 'hover:border-emerald-500/50', bg: 'bg-emerald-500/10', text: 'text-emerald-500', borderIcon: 'border-emerald-500/20',
                    title: 'ONLINE', sub: 'Sincronización Activa', pulse: 'animate-pulse text-emerald-500', icon: <Activity size={20} />
                };
            case 'qr':
                return {
                    border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-500', borderIcon: 'border-amber-500/20',
                    title: 'VINCULACIÓN', sub: 'Escanea el código abajo', pulse: 'animate-pulse text-amber-500', icon: <QrCode size={20} />
                };
            case 'connecting':
                return {
                    border: 'hover:border-blue-500/50 border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-500', borderIcon: 'border-blue-500/20',
                    title: 'CONECTANDO', sub: 'Negociando conexión...', pulse: 'text-blue-500', icon: <RefreshCw size={20} className="animate-spin" />
                };
            case 'disconnected':
            default:
                return {
                    border: 'hover:border-rose-500/50 border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-500', borderIcon: 'border-rose-500/20',
                    title: 'OFFLINE', sub: 'Conexión Perdida', pulse: 'text-rose-500', icon: <AlertTriangle size={20} />
                };
        }
    };

    const botUI = getBotUI();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full text-zinc-500 animate-pulse font-mono">
                {'>'} CARGANDO SISTEMA CENTRAL...
            </div>
        );
    }

    // Lógica de datos (sin cambios)
    const totalRevenue = logs.reduce((acc, log) => acc + (Number(log.monto) || 0), 0);
    const activeUsersCount = users.filter((u: any) => u.subscriptionStatus === 'active').length;
    const totalUsersCount = users.length;
    const recentLogs = [...logs].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5);
    const recentUsers = Array.isArray(users) ? [...users].sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.fechaAlta ? new Date(a.fechaAlta).getTime() : 0);
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.fechaAlta ? new Date(b.fechaAlta).getTime() : 0);
        return dateB - dateA;
    }).slice(0, 5) : [];
    
    const revenueData = [{ name: 'Ene', total: totalRevenue * 0.2 }, { name: 'Feb', total: totalRevenue * 0.35 }, { name: 'Mar', total: totalRevenue * 0.45 }];
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
                {/* Botones de Usuarios y Caja (sin cambios) */}
                <button onClick={() => setCurrentView('users')} className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 relative overflow-hidden group hover:border-indigo-500/50 transition-all text-left w-full shadow-lg">
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={60} /></div>
                   <div className="flex justify-between items-start">
                       <div>
                           <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Suscripciones Activas</p>
                           <h3 className="text-3xl font-black text-white mt-2">{activeUsersCount} <span className="text-lg text-zinc-700 font-normal">/ {totalUsersCount}</span></h3>
                       </div>
                       <div className="bg-indigo-500/10 p-2 rounded-xl text-indigo-400 border border-indigo-500/20"><Users size={20} /></div>
                   </div>
                   <div className="mt-4 flex items-center gap-1 text-[10px] text-indigo-400 font-bold uppercase tracking-tighter group-hover:gap-2 transition-all">Gestionar Usuarios <ArrowRight size={12} /></div>
                </button>

                <button onClick={() => setCurrentView('audit')} className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 relative overflow-hidden group hover:border-emerald-500/50 transition-all text-left w-full shadow-lg">
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign size={60} /></div>
                   <div className="flex justify-between items-start">
                       <div>
                           <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Caja Histórica</p>
                           <h3 className="text-3xl font-black text-white mt-2">${totalRevenue.toLocaleString()}</h3>
                       </div>
                       <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 border border-emerald-500/20"><TrendingUp size={20} /></div>
                   </div>
                   <div className="mt-4 flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-tighter group-hover:gap-2 transition-all">Ver Auditoría <ArrowRight size={12} /></div>
                </button>

                {/* WIDGET DEL BOT CORREGIDO CON QR */}
                <div className={`bg-zinc-900 p-6 rounded-2xl border relative overflow-hidden group transition-all shadow-lg ${botUI.border}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Estado del Bot</p>
                            <h3 className={`text-2xl font-black mt-2 ${botUI.text}`}>{botUI.title}</h3>
                        </div>
                        <div className={`${botUI.bg} p-2 rounded-xl ${botUI.text} border ${botUI.borderIcon}`}>
                            {botUI.icon}
                        </div>
                    </div>

                    {/* MOSTRAR QR SI EL ESTADO ES 'qr' */}
                    {botState.status === 'qr' && botState.qrLink && (
                        <div className="mt-4 flex flex-col items-center animate-in zoom-in duration-300">
                            <div className="bg-white p-2 rounded-xl mb-4 shadow-inner">
                                <img 
                                    src={botState.qrLink} 
                                    alt="WhatsApp QR" 
                                    className="w-40 h-40 object-contain rounded-lg"
                                />
                            </div>
                            <a 
                                href={botState.qrLink} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="flex items-center gap-2 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 px-4 rounded-full transition-colors uppercase tracking-widest"
                            >
                                <ExternalLink size={12} /> Abrir QR en nueva pestaña
                            </a>
                        </div>
                    )}

                    <p className={`mt-4 text-[10px] font-bold uppercase tracking-widest ${botUI.pulse}`}>
                        {botUI.sub}
                    </p>
                </div>
            </div>

            {/* Resto del Dashboard (Gráficos y tablas) sin cambios */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
                    <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/40">
                        <h3 className="font-bold text-sm text-white flex items-center gap-2 uppercase tracking-tight">
                            <Activity size={16} className="text-emerald-500"/> Registro de Movimientos
                        </h3>
                    </div>
                    <div className="flex-1 overflow-auto max-h-[350px]">
                        <table className="w-full text-left text-sm">
                            <tbody className="divide-y divide-zinc-800/50">
                                {recentLogs.map(log => (
                                    <tr key={log.id} className="group hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="text-zinc-200 font-bold text-xs uppercase">{log.accion}</div>
                                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{log.detalle}</div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="text-emerald-400 font-mono font-bold">{"+$" + (Number(log.monto) || 0).toLocaleString()}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
                    <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/40">
                        <h3 className="font-bold text-sm text-white flex items-center gap-2 uppercase tracking-tight">
                            <Users size={16} className="text-indigo-500"/> Actividad de Clientes
                        </h3>
                    </div>
                    <div className="flex-1 overflow-auto max-h-[350px]">
                        <table className="w-full text-left text-sm">
                            <tbody className="divide-y divide-zinc-800/50">
                                {recentUsers.map(user => (
                                    <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="text-zinc-200 font-bold text-xs uppercase tracking-tight">{user.nombre}</div>
                                            <div className="text-[10px] text-zinc-500 font-mono">{user.email}</div>
                                        </td>
                                        <td className="p-4 text-right font-black text-[9px] uppercase">
                                            <span className={user.subscriptionStatus === 'active' ? 'text-emerald-400' : 'text-rose-400'}>
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
            
            {/* Gráficos Recharts (simplificados por espacio, mantén los tuyos originales aquí) */}
        </div>
    );
}