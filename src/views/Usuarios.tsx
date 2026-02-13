import { useState } from 'react';
import { 
    Users, Search, Filter, Edit2, Lock, Unlock, RefreshCw, 
    Download, Plus, CheckCircle2, Zap, MessageCircle, 
    AlertTriangle, Calendar, CreditCard
} from 'lucide-react';
import UserEditModal from '../components/UserEditModal';
import type { DashboardUser } from '../types';

interface UsuariosProps {
    users: DashboardUser[];
    isLoading: boolean;
    onRefresh: () => void;
    onUpdateStatus: (data: { userId: string, newStatus: 'active' | 'trialing' | 'expired', trialEndsAt?: string }) => void;
    onToggleStatus: (userId: string) => void;
    onCycleStatus: (userId: string) => void;
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

const Usuarios = ({ users, isLoading, onRefresh, onUpdateStatus, onToggleStatus, onCycleStatus }: UsuariosProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('Todos');
    const [editingUser, setEditingUser] = useState<DashboardUser | null>(null);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean; title: string; message: string; action: () => void; type: 'danger' | 'warning' | 'info';
    }>({ isOpen: false, title: '', message: '', action: () => {}, type: 'info' });

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'Todos' || user.subscriptionStatus === filterStatus.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    const handleWhatsApp = (user: DashboardUser) => {
        const text = `Hola ${user.nombre}, Soporte GSM-FIX te contacta. Tu estado es: ${user.subscriptionStatus}.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (users && users.length > 0) {
        console.log("Datos recibidos:", users[0]);
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">
            
            <UserEditModal 
                isOpen={!!editingUser} 
                onClose={() => setEditingUser(null)} 
                user={editingUser}
                onSave={(id, status, trialDate) => onUpdateStatus({ userId: id, newStatus: status as any, trialEndsAt: trialDate })}
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
                        <Download size={14} /> EXPORTAR CSV
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
                        <Plus size={14} /> NUEVO CLIENTE
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
                        <option value="trialing">EN PRUEBA (TRIAL)</option>
                        <option value="expired">EXPIRADOS</option>
                    </select>
                </div>
                <button onClick={onRefresh} className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all">
                    <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                    SINCRONIZAR
                </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-950/50 border-b border-zinc-800">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase">Suscriptor</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase">Plan</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase">Vencimiento</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-indigo-400 text-xs font-black border border-zinc-700 uppercase">
                                                {user.nombre.substring(0, 2)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-zinc-100">{user.nombre}</p>
                                                <p className="text-[10px] text-zinc-500 font-mono tracking-tighter">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <PlanBadge plan={user.plan} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={user.subscriptionStatus} />
                                    </td>
                                    <td className="px-6 py-4">
                                        {(() => {
                                            const expirationDate = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
                                            const now = new Date();
                                            const diffTime = expirationDate ? expirationDate.getTime() - now.getTime() : null;
                                            const diffDays = diffTime !== null ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : null;
                                            const isUrgent = diffDays !== null && diffDays <= 3;

                                            return (
                                                <div className={`flex items-center gap-2 font-mono text-xs ${isUrgent ? 'text-red-500 font-bold' : 'text-zinc-400'}`}>
                                                    <Calendar size={14} className={isUrgent ? 'text-red-500' : 'text-zinc-600'} />
                                                    {user.trialEndsAt ? new Date(user.trialEndsAt).toLocaleDateString() : 'N/A'}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button 
                                                onClick={() => handleWhatsApp(user)} 
                                                className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-lg transition-all" 
                                                title="Enviar WhatsApp"
                                            >
                                                <MessageCircle size={16} />
                                            </button>
                                            
                                            <button 
                                                onClick={() => setEditingUser(user)} 
                                                className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all"
                                                title="Editar Usuario"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            
                                            <button 
                                                onClick={() => onToggleStatus(user.id)}
                                                className={`p-2 rounded-lg transition-all ${
                                                    user.subscriptionStatus === 'active' 
                                                    ? 'hover:bg-red-500/10 text-red-500/70 hover:text-red-500' 
                                                    : 'hover:bg-emerald-500/10 text-emerald-500/70 hover:text-emerald-500'
                                                }`}
                                                title={user.subscriptionStatus === 'active' ? 'Bloquear Acceso' : 'Activar Acceso'}
                                            >
                                                {user.subscriptionStatus === 'active' ? <Lock size={16} /> : <Unlock size={16} />}
                                            </button>

                                            <button 
                                                onClick={() => onCycleStatus(user.id)}
                                                className="p-2 hover:bg-zinc-800 text-zinc-500 hover:text-amber-500 rounded-lg transition-all" 
                                                title="Rotar Estado (Trial -> Active)"
                                            >
                                                <Zap size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Modal de confirmación (placeholder para futuras acciones) */}
            {confirmModal.isOpen && (
                <div className="hidden" />
            )}
        </div>
    );
};

export default Usuarios;