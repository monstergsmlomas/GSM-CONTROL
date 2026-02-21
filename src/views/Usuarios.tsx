import { useState } from 'react';
import { 
    Users, Search, Filter, Edit2, Lock, Unlock, RefreshCw, 
    Download, Plus, Zap, MessageCircle, 
    AlertTriangle, Calendar, CreditCard
} from 'lucide-react';
import UserEditModal from '../components/UserEditModal';
import type { DashboardUser } from '../types';

interface UsuariosProps {
    users: DashboardUser[];
    isLoading: boolean;
    onRefresh: () => void;
    onUpdateStatus: (data: { userId: string, newStatus: 'active' | 'trialing' | 'expired', trialEndsAt?: string, currentPeriodEnd?: string, cicloDePago?: string, sucursalesExtra?: number, plan?: string, telefono?: string }) => void;
    onToggleStatus: (userId: string) => void;
    onCycleStatus: (userId: string) => void;
    onDeleteUser: (userId: string) => void;
    whatsappTemplate: string;
    alertThreshold: number;
}

const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        'active': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        'trialing': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        'expired': 'bg-rose-500/10 text-rose-500 border-rose-500/20'
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border flex items-center gap-1.5 w-fit ${styles[status] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
            <span className={`w-1 h-1 rounded-full ${status === 'active' ? 'bg-emerald-500' : status === 'trialing' ? 'bg-blue-500' : 'bg-rose-500'}`} />
            {status}
        </span>
    );
};

const PlanBadge = ({ plan }: { plan: string }) => {
    const styles: any = {
        'Premium AI': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        'Multisede': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        'Estandar': 'bg-zinc-700/10 text-zinc-400 border-zinc-700/20',
        'Free': 'bg-zinc-800 text-zinc-500'
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border w-fit ${styles[plan] || 'bg-zinc-800 text-zinc-400'}`}>
            {plan}
        </span>
    );
};

const Usuarios = ({ users, isLoading, onRefresh, onUpdateStatus, onToggleStatus, onCycleStatus, onDeleteUser, whatsappTemplate, alertThreshold }: UsuariosProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('Todos');
    const [editingUser, setEditingUser] = useState<DashboardUser | null>(null);

    const getUrgencyInfo = (expiryDate: string | null, status: string) => {
        let diffHours = Infinity;
        
        if (expiryDate) {
            const now = new Date().getTime();
            const expiry = new Date(expiryDate).getTime();
            if (!isNaN(expiry)) {
                diffHours = (expiry - now) / (1000 * 60 * 60);
            }
        }

        // 1. ROJO: Si el estado en DB es expired, o si las horas ya pasaron a negativo
        if (status === 'expired' || diffHours < 0) {
            return { color: 'text-rose-500 font-black', badge: 'VENCIDO' };
        }
        
        // 2. NARANJA: Solo si faltan menos de 48 horas
        if (diffHours <= (alertThreshold || 48)) {
            return { color: 'text-amber-400 font-bold', badge: diffHours < 24 ? 'CRÍTICO' : 'POR VENCER', pulse: true };
        }
        
        // 3. BLANCO: Resto de los usuarios activos y sanos
        return { color: 'text-zinc-100', badge: null };
    };

    const filteredUsers = Array.isArray(users) ? users
        .filter(user => {
            const matchesSearch = user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  user.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'Todos' || user.subscriptionStatus === filterStatus.toLowerCase();
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            const getUrgencyScore = (u: DashboardUser) => {
                if (u.subscriptionStatus === 'expired') return 0;
                const expiry = new Date(u.currentPeriodEnd || u.trialEndsAt || 0).getTime();
                const diff = (expiry - new Date().getTime()) / (1000 * 60 * 60);
                return (diff > 0 && diff <= (alertThreshold || 48)) ? 2 : 1;
            };
            return getUrgencyScore(b) - getUrgencyScore(a);
        }) : [];

    const handleWhatsApp = (user: DashboardUser) => {
        let text = whatsappTemplate
            .replace(/{nombre}/g, user.nombre)
            .replace(/{plan}/g, user.plan || 'Free')
            .replace(/{estado}/g, user.subscriptionStatus.toUpperCase());
            
        if (user.telefono) {
            const numeroLimpio = user.telefono.replace(/\D/g, '');
            window.open(`https://wa.me/${numeroLimpio}?text=${encodeURIComponent(text)}`, '_blank');
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">
            <UserEditModal 
                key={editingUser?.id || 'modal'}
                isOpen={!!editingUser} 
                onClose={() => setEditingUser(null)} 
                user={editingUser}
                onSave={(id, status, trialDate, periodEnd, ciclo, sucursales, plan, telefono) => {
                    onUpdateStatus({ 
                        userId: id, 
                        newStatus: status as any, 
                        trialEndsAt: trialDate || undefined, 
                        currentPeriodEnd: periodEnd || undefined, 
                        cicloDePago: ciclo as any, 
                        sucursalesExtra: sucursales, 
                        plan: plan as any, 
                        telefono: telefono 
                    });
                    setEditingUser(null);
                }}
                onDelete={(id) => {
                    onDeleteUser(id);
                    setEditingUser(null);
                }}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                        <Users className="text-indigo-500" /> Registro de Suscriptores
                    </h2>
                    <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.2em] mt-1">Gestión Centralizada de Accesos</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-xl text-[10px] font-black uppercase hover:text-white transition-all"><Download size={12} /> CSV</button>
                    <button className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"><Plus size={12} /> Nuevo Cliente</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                    <input type="text" placeholder="BUSCAR POR NOMBRE O EMAIL..." className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-[11px] font-bold text-white focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-700 uppercase" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                    <select className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-10 pr-4 text-[10px] font-black text-zinc-400 outline-none appearance-none cursor-pointer uppercase" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="Todos">TODOS</option>
                        <option value="active">ACTIVOS</option>
                        <option value="trialing">TRIAL</option>
                        <option value="expired">EXPIRADOS</option>
                    </select>
                </div>
                <button onClick={onRefresh} className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-2xl transition-all font-black text-[10px] uppercase">
                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Sincronizar
                </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-950/50 border-b border-zinc-800">
                            <tr>
                                <th className="px-6 py-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Suscriptor</th>
                                <th className="px-6 py-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Plan / Estado</th>
                                <th className="px-6 py-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Vencimientos</th>
                                <th className="px-6 py-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest text-right">Gestión</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredUsers.map((user) => {
                                const urgency = getUrgencyInfo(user.currentPeriodEnd || user.trialEndsAt, user.subscriptionStatus);
                                return (
                                    <tr key={user.id} className={`group transition-colors ${urgency.badge === 'VENCIDO' ? 'bg-rose-500/5' : urgency.badge ? 'bg-amber-500/5' : 'hover:bg-white/5'}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black border uppercase transition-all shadow-inner ${urgency.badge === 'VENCIDO' ? 'bg-rose-500/20 border-rose-500/40 text-rose-500' : urgency.badge ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-zinc-800 border-zinc-700 text-indigo-400'}`}>
                                                    {user.nombre.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className={`font-bold text-sm uppercase tracking-tight ${urgency.color}`}>{user.nombre}</p>
                                                        {urgency.badge && (
                                                            <span className={`flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-md border ${urgency.badge === 'VENCIDO' ? 'bg-rose-500/20 border-rose-500/30 text-rose-500' : 'bg-amber-500/20 border-amber-500/30 text-amber-500'} ${urgency.pulse ? 'animate-pulse' : ''}`}>
                                                                <AlertTriangle size={8} /> {urgency.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <PlanBadge plan={user.plan} />
                                                <StatusBadge status={user.subscriptionStatus} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[10px]">
                                            <div className="space-y-1.5">
                                                <div className={`flex items-center gap-2 ${urgency.badge ? 'text-amber-400' : user.subscriptionStatus === 'active' ? 'text-emerald-400' : 'text-zinc-600'}`}><CreditCard size={10} /> SUSC: {user.currentPeriodEnd ? new Date(user.currentPeriodEnd).toLocaleDateString() : '--/--'}</div>
                                                <div className={`flex items-center gap-2 ${user.subscriptionStatus === 'trialing' ? 'text-amber-400' : 'text-zinc-600'}`}><Calendar size={10} /> TRIAL: {user.trialEndsAt ? new Date(user.trialEndsAt).toLocaleDateString() : '--/--'}</div>
                                                {(user.updatedAt || user.lastSeen) && (
                                                    <div className="flex items-center gap-2 pt-1 opacity-50"><div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" /><span className="text-[8px] uppercase font-black">ONLINE</span></div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleWhatsApp(user)} className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-lg"><MessageCircle size={14} /></button>
                                                <button onClick={() => setEditingUser(user)} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg"><Edit2 size={14} /></button>
                                                <button onClick={() => onToggleStatus(user.id)} className={`p-2 rounded-lg transition-all ${user.subscriptionStatus === 'active' ? 'text-rose-500/70 hover:text-rose-500' : 'text-emerald-500/70 hover:text-emerald-500'}`}>{user.subscriptionStatus === 'active' ? <Lock size={14} /> : <Unlock size={14} />}</button>
                                                <button onClick={() => onCycleStatus(user.id)} className="p-2 hover:bg-zinc-800 text-zinc-500 hover:text-amber-500 rounded-lg"><Zap size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Usuarios;