import { useState } from 'react';
import { 
    Users, Search, Filter, Edit2, Lock, Unlock, RefreshCw, 
    Download, Plus, Zap, MessageCircle, 
    AlertTriangle, Calendar, CreditCard, Clock
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
        'trialing': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        'expired': 'bg-rose-500/10 text-rose-500 border-rose-500/20'
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border flex items-center gap-1 w-fit ${styles[status] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
            <span className={`w-1 h-1 rounded-full ${status === 'active' ? 'bg-emerald-500' : status === 'trialing' ? 'bg-amber-500' : 'bg-rose-500'}`} />
            {status}
        </span>
    );
};

const PlanBadge = ({ plan }: { plan: string }) => {
    const styles: any = {
        'Premium AI': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        'Multisede': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        'Estandar': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        'Free': 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
    };
    return (
        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border flex items-center gap-1 w-fit ${styles[plan] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
            {plan}
        </span>
    );
};

const Usuarios = ({ users, isLoading, onRefresh, onUpdateStatus, onToggleStatus, onCycleStatus, onDeleteUser, whatsappTemplate, alertThreshold }: UsuariosProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('Todos');
    const [editingUser, setEditingUser] = useState<DashboardUser | null>(null);

    // LÓGICA DE FILTRADO + ORDENAMIENTO (Ponemos los urgentes primero)
    const filteredUsers = users
        .filter(user => {
            const matchesSearch = user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  user.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'Todos' || user.subscriptionStatus === filterStatus.toLowerCase();
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            // Prioridad: Activos/Trialing que vencen pronto arriba de todo
            const getUrgencyScore = (u: DashboardUser) => {
                if (u.subscriptionStatus === 'expired') return 0;
                const expiry = new Date(u.currentPeriodEnd || u.trialEndsAt || 0).getTime();
                const diff = (expiry - new Date().getTime()) / (1000 * 60 * 60);
                return (diff > 0 && diff <= alertThreshold) ? 2 : 1;
            };
            return getUrgencyScore(b) - getUrgencyScore(a);
        });

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

    const getUrgencyInfo = (expiryDate: string | null, status: string) => {
        if (!expiryDate || status === 'expired') return { color: 'text-zinc-100', badge: null };
        
        const now = new Date().getTime();
        const expiry = new Date(expiryDate).getTime();
        const diffHours = (expiry - now) / (1000 * 60 * 60);

        if (diffHours < 0) return { color: 'text-rose-500', badge: 'VENCIDO' };
        
        if (diffHours <= alertThreshold) {
            return { 
                color: 'text-amber-400 font-bold', 
                badge: diffHours < 24 ? 'CRÍTICO (<24h)' : 'POR VENCER',
                pulse: true 
            };
        }
        return { color: 'text-zinc-100', badge: null };
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
                        cicloDePago: ciclo,
                        sucursalesExtra: sucursales,
                        plan: plan,
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
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="text-indigo-500" /> Control de Suscripciones
                    </h2>
                    <p className="text-zinc-500 text-sm font-mono uppercase tracking-tighter">Panel de administración de accesos GSM-FIX</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-bold hover:text-white transition-all">
                        <Download size={14} /> EXPORTAR
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
                        <Plus size={14} /> NUEVO
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o email..." 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                    <select 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-300 outline-none appearance-none cursor-pointer"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="Todos">TODOS LOS ESTADOS</option>
                        <option value="active">ACTIVOS</option>
                        <option value="trialing">TRIAL</option>
                        <option value="expired">EXPIRADOS</option>
                    </select>
                </div>
                <button onClick={onRefresh} className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all font-bold text-xs">
                    <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                    SINCRONIZAR
                </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-950/50 border-b border-zinc-800">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase">Suscriptor</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase">Plan / Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase">Vencimientos</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase text-right">Gestión</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredUsers.map((user) => {
                                const urgency = getUrgencyInfo(user.currentPeriodEnd || user.trialEndsAt, user.subscriptionStatus);
                                
                                return (
                                    <tr key={user.id} className={`group transition-colors ${urgency.badge ? 'bg-amber-500/3' : 'hover:bg-white/2'}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black border uppercase transition-all
                                                    ${urgency.badge ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-zinc-800 border-zinc-700 text-indigo-400'}
                                                `}>
                                                    {user.nombre.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className={`font-bold text-sm ${urgency.color}`}>
                                                            {user.nombre}
                                                        </p>
                                                        {urgency.badge && (
                                                            <span className={`flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded border ${urgency.badge === 'VENCIDO' ? 'bg-rose-500/20 border-rose-500/30 text-rose-500' : 'bg-amber-500/20 border-amber-500/30 text-amber-500'} ${urgency.pulse ? 'animate-pulse' : ''}`}>
                                                                <AlertTriangle size={8} /> {urgency.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-zinc-500 font-mono tracking-tighter">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <PlanBadge plan={user.plan} />
                                                <StatusBadge status={user.subscriptionStatus} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1.5">
                                                <div className={`flex items-center gap-2 font-mono text-[10px] ${urgency.badge ? 'text-amber-400' : user.subscriptionStatus === 'active' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                    <CreditCard size={12} />
                                                    Susc: {user.currentPeriodEnd ? new Date(user.currentPeriodEnd).toLocaleDateString('es-AR') : '--/--/--'}
                                                </div>
                                                <div className={`flex items-center gap-2 font-mono text-[10px] ${user.subscriptionStatus === 'trialing' ? 'text-amber-400' : 'text-zinc-500'}`}>
                                                    <Calendar size={12} />
                                                    Trial: {user.trialEndsAt ? new Date(user.trialEndsAt).toLocaleDateString('es-AR') : '--/--/--'}
                                                </div>
                                                {(user.updatedAt || user.lastSeen) && (
                                                    <div className="flex items-center gap-3 pt-1">
                                                        {user.updatedAt && <span className="text-[9px] text-zinc-600 font-mono">Mod: {new Date(user.updatedAt).toLocaleDateString()}</span>}
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                                                            <span className="text-[9px] text-zinc-600 font-mono uppercase">Online</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleWhatsApp(user)} className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-lg" title="WhatsApp">
                                                    <MessageCircle size={16} />
                                                </button>
                                                <button onClick={() => setEditingUser(user)} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg" title="Editar">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => onToggleStatus(user.id)} className={`p-2 rounded-lg transition-all ${user.subscriptionStatus === 'active' ? 'text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10' : 'text-emerald-500/70 hover:text-emerald-500 hover:bg-emerald-500/10'}`}>
                                                    {user.subscriptionStatus === 'active' ? <Lock size={16} /> : <Unlock size={16} />}
                                                </button>
                                                <button onClick={() => onCycleStatus(user.id)} className="p-2 hover:bg-zinc-800 text-zinc-500 hover:text-amber-500 rounded-lg" title="Rotar Estado">
                                                    <Zap size={16} />
                                                </button>
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