import { useState, useEffect } from 'react';
import { X, Calendar, Save } from 'lucide-react';
import type { DashboardUser } from '../types';

interface UserEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: DashboardUser | null;
    onSave: (userId: string, newStatus: string, trialEndsAt: string) => void;
}

export default function UserEditModal({ isOpen, onClose, user, onSave }: UserEditModalProps) {
    const [status, setStatus] = useState('');
    const [trialDate, setTrialDate] = useState('');

    useEffect(() => {
        if (user) {
            setStatus(user.subscriptionStatus);
            // Formatear la fecha para el input type="date" (YYYY-MM-DD)
            const date = user.trialEndsAt ? new Date(user.trialEndsAt).toISOString().split('T')[0] : '';
            setTrialDate(date);
        }
    }, [user]);

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/20">
                    <div>
                        <h3 className="text-white font-bold">Editar Suscripción</h3>
                        <p className="text-zinc-500 text-xs font-mono">{user.email}</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Formulario */}
                <div className="p-6 space-y-5">
                    {/* Selector de Estado */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            Estado de Cuenta
                        </label>
                        <select 
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="active">ACTIVE (ACTIVO)</option>
                            <option value="trialing">TRIALING (EN PRUEBA)</option>
                            <option value="expired">EXPIRED (EXPIRADO)</option>
                        </select>
                    </div>

                    {/* Selector de Fecha de Trial (NUEVO) */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={12} className="text-indigo-500" /> Vencimiento de Trial
                        </label>
                        <input 
                            type="date"
                            value={trialDate}
                            onChange={(e) => setTrialDate(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white focus:border-indigo-500 outline-none transition-all scheme-dark"
                        />
                        <p className="text-[9px] text-zinc-600 font-medium">
                            * Al cambiar esta fecha, el sistema recalculará automáticamente el acceso del cliente.
                        </p>
                    </div>
                </div>

                {/* Footer / Acciones */}
                <div className="p-6 bg-zinc-950/40 border-t border-zinc-800 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                    >
                        CANCELAR
                    </button>
                    <button 
                        onClick={() => onSave(user.id, status, trialDate)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/10"
                    >
                        <Save size={16} /> GUARDAR CAMBIOS
                    </button>
                </div>
            </div>
        </div>
    );
}
