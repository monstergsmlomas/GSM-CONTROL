import { useState } from 'react';
import { 
    Users, 
    Search, 
    Filter, 
    Edit2, 
    Lock, 
    Unlock, 
    RefreshCw, 
    Download, 
    Plus,
    CheckCircle2,
    XCircle,
    ShieldAlert,
    Zap,
    X,
    MessageCircle, // Icono para WhatsApp
    AlertTriangle // Icono para Alertas del modal
} from 'lucide-react';
import UserEditModal from '../components/UserEditModal';
import type { DashboardUser } from '../types';

interface UsuariosProps {
    users: DashboardUser[];
    isLoading: boolean;
    onRefresh: () => void;
    onUpdatePlan: (data: { userId: string, newPlan: string }) => void;
    onToggleStatus: (userId: string) => void;
    onCyclePlan: (userId: string) => void;
}

const PlanBadge = ({ plan }: { plan: string }) => {
    const styles: any = {
        'Premium AI': 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/10 shadow-[0_0_10px]',
        'Multisede': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        'Estandar': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'Free': 'bg-zinc-800 text-zinc-400 border-zinc-700'
    };
    return (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1 w-fit ${styles[plan] || styles['Free']}`}>
            {plan === 'Premium AI' && <span className="text-amber-500">✨</span>}
            {plan}
        </span>
    );
};

const Usuarios = ({ users, isLoading, onRefresh, onUpdatePlan, onToggleStatus, onCyclePlan }: UsuariosProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('Todos');
    const [editingUser, setEditingUser] = useState<DashboardUser | null>(null);

    // --- ESTADO PARA CONFIRMACIÓN ---
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: () => void;
        type: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        action: () => {},
        type: 'info'
    });

    // --- MANEJADORES DE ACCIÓN SEGUROS ---
    const confirmToggleStatus = (user: DashboardUser) => {
        const isActive = user.estado === 'Activo';
        setConfirmModal({
            isOpen: true,
            title: isActive ? 'Bloquear Usuario' : 'Activar Usuario',
            message: `¿Estás seguro de que deseas ${isActive ? 'restringir' : 'restaurar'} el acceso a ${user.nombre}?`,
            type: isActive ? 'danger' : 'info',
            action: () => {
                onToggleStatus(user.id);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const confirmCyclePlan = (user: DashboardUser) => {
        setConfirmModal({
            isOpen: true,
            title: 'Rotación Rápida',
            message: `Se cambiará el plan de ${user.nombre} al siguiente nivel inmediatamente.`,
            type: 'warning',
            action: () => {
                onCyclePlan(user.id);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const confirmSaveEdit = (userId: string, newPlan: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Guardar Cambios',
            message: `El plan se actualizará a "${newPlan}". ¿Confirmar?`,
            type: 'info',
            action: () => {
                onUpdatePlan({ userId, newPlan });
                setEditingUser(null);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // --- LÓGICA DE FILTRADO MEJORADA ---
    const filteredUsers = users.filter(user => {
        // 1. Filtro de Búsqueda (Texto)
        const matchesSearch = user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              user.email.toLowerCase().includes(searchTerm.toLowerCase());
        
        // 2. Filtro de Estado / Antigüedad / Plan
        let matchesStatus = true;

        if (filterStatus === 'Nuevos') {
            // Usuarios registrados en los últimos 30 días
            const date = new Date(user.fechaAlta);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            matchesStatus = date >= thirtyDaysAgo;
        } else if (filterStatus === 'Free') {
             // NUEVO: Filtro solo usuarios Free
             matchesStatus = user.plan === 'Free';
        } else if (filterStatus !== 'Todos') {
            // Lógica estándar (Activo, Inactivo, Pendiente)
            matchesStatus = user.estado === filterStatus;
        }

        return matchesSearch && matchesStatus;
    });

    // Acción de WhatsApp
    const handleWhatsApp = (user: DashboardUser) => {
        // Mensaje dinámico SaaS
        const text = `Hola ${user.nombre}, te contactamos desde Soporte GSM-FIX para consultas sobre tu plan ${user.plan}.`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">
            
            {/* MODAL DE EDICIÓN */}
            <UserEditModal 
                key={editingUser?.id || 'modal'}
                isOpen={!!editingUser} 
                onClose={() => setEditingUser(null)} 
                user={editingUser}
                onSave={confirmSaveEdit}
            />

            {/* MODAL DE CONFIRMACIÓN */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className={`h-1 w-full ${
                            confirmModal.type === 'danger' ? 'bg-red-500' : 
                            confirmModal.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'
                        }`} />
                        <div className="p-6">
                            <div className="flex gap-4">
                                <div className={`p-3 rounded-full h-12 w-12 flex items-center justify-center shrink-0 ${
                                    confirmModal.type === 'danger' ? 'bg-red-500/10 text-red-500' : 
                                    confirmModal.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-500'
                                }`}>
                                    <AlertTriangle size={24} /> 
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{confirmModal.title}</h3>
                                    <p className="text-sm text-zinc-400 mt-1">{confirmModal.message}</p>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button 
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm font-medium"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={confirmModal.action}
                                    className={`px-4 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2 ${
                                        confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
                                        confirmModal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
                                    }`}
                                >
                                    <CheckCircle2 size={16} /> Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="text-indigo-500" />
                        Gestión SaaS
                    </h2>
                    <p className="text-zinc-400 text-sm mt-1">Administra accesos y planes de suscripción.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors border border-zinc-700">
                        <Download size={16} /> Exportar
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-900/20">
                        <Plus size={16} /> Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* TOOLBAR & FILTROS */}
            <div className="flex flex-col md:flex-row gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por cliente, email o ID..." 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-zinc-200 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <select 
                            className="bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-8 text-zinc-300 text-sm focus:outline-none appearance-none cursor-pointer hover:border-zinc-700"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="Todos">Todos</option>
                            <option value="Nuevos">✨ Nuevos (30 días)</option>
                            <option value="Free">🎁 Usuarios Free</option>
                            <option value="Activo">✅ Activos</option>
                            <option value="Inactivo">🚫 Inactivos</option>
                        </select>
                    </div>
                    <button onClick={onRefresh} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors" title="Actualizar lista">
                        <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* TABLA DE USUARIOS */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-zinc-950/50 border-b border-zinc-800">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Plan SaaS</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Ciclo</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="group hover:bg-zinc-800/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs font-bold border border-zinc-700 shadow-sm">
                                                {user.nombre.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-zinc-200">{user.nombre}</p>
                                                <p className="text-xs text-zinc-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {user.estado === 'Activo' && <CheckCircle2 size={16} className="text-emerald-500" />}
                                            {user.estado === 'Inactivo' && <XCircle size={16} className="text-red-500" />}
                                            {user.estado === 'Pendiente' && <ShieldAlert size={16} className="text-amber-500" />}
                                            <span className={`text-sm ${
                                                user.estado === 'Activo' ? 'text-emerald-400' : 
                                                user.estado === 'Inactivo' ? 'text-red-400' : 'text-amber-400'
                                            }`}>
                                                {user.estado}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <PlanBadge plan={user.plan} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                                            {user.ciclo || 'Mensual'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            
                                            {/* 1. Botón WhatsApp (Verde) */}
                                            <button 
                                                onClick={() => handleWhatsApp(user)}
                                                className="p-1.5 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-500 rounded-lg transition-colors border border-transparent hover:border-emerald-500/20" 
                                                title="WhatsApp Cliente"
                                            >
                                                <MessageCircle size={16} className="text-emerald-500" />
                                            </button>

                                            {/* 2. Botón Editar */}
                                            <button 
                                                onClick={() => setEditingUser(user)}
                                                className="p-1.5 hover:bg-indigo-500/10 text-zinc-400 hover:text-indigo-400 rounded-lg transition-colors" 
                                                title="Editar Usuario"
                                            >
                                                <Edit2 size={16} />
                                            </button>

                                            {/* 3. Botón Estado */}
                                            <button 
                                                onClick={() => confirmToggleStatus(user)}
                                                className={`p-1.5 rounded-lg transition-colors ${
                                                    user.estado === 'Activo' 
                                                    ? 'hover:bg-red-500/10 text-zinc-400 hover:text-red-400' 
                                                    : 'hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-400'
                                                }`}
                                                title={user.estado === 'Activo' ? 'Bloquear Usuario' : 'Activar Usuario'}
                                            >
                                                {user.estado === 'Activo' ? <Lock size={16} /> : <Unlock size={16} />}
                                            </button>

                                            {/* 4. Botón Plan Rápido */}
                                            <button 
                                                onClick={() => confirmCyclePlan(user)}
                                                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors" 
                                                title="Rotar Plan SaaS"
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
                 <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-between items-center text-xs text-zinc-500">
                    <span>Mostrando {filteredUsers.length} de {users.length} usuarios</span>
                    <div className="flex gap-2">
                        <button className="hover:text-zinc-300 disabled:opacity-50" disabled>Anterior</button>
                        <button className="hover:text-zinc-300 disabled:opacity-50" disabled>Siguiente</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Usuarios;
