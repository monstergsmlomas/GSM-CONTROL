import { useState, useEffect } from 'react';
import { X, Calendar, Save, Building2, CreditCard, Trash2, Package } from 'lucide-react';
import type { DashboardUser } from '../types';

interface UserEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: DashboardUser | null;
    onSave: (userId: string, newStatus: string, trialEndsAt: string, currentPeriodEnd: string, cicloDePago: string, sucursalesExtra: number, plan: string) => void;
    onDelete: (userId: string) => void;
}

export default function UserEditModal({ isOpen, onClose, user, onSave, onDelete }: UserEditModalProps) {
    const [status, setStatus] = useState('');
    const [trialDate, setTrialDate] = useState('');
    const [periodEnd, setPeriodEnd] = useState(''); // NUEVO ESTADO PARA SUSCRIPCIÓN
    const [ciclo, setCiclo] = useState('mensual');
    const [sucursales, setSucursales] = useState(0);
    const [plan, setPlan] = useState('Estandar');

    useEffect(() => {
        if (user) {
            setStatus(user.subscriptionStatus);
            // Formatear Fecha Trial
            const tDate = user.trialEndsAt ? new Date(user.trialEndsAt).toISOString().split('T')[0] : '';
            setTrialDate(tDate);
            // Formatear Fecha Suscripción
            const pDate = user.currentPeriodEnd ? new Date(user.currentPeriodEnd).toISOString().split('T')[0] : '';
            setPeriodEnd(pDate);

            setCiclo(user.cicloDePago || 'mensual');
            setSucursales(user.sucursalesExtra || 0);
            setPlan(user.plan || 'Estandar');
        }
    }, [user]);

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/20 shrink-0">
                    <div>
                        <h3 className="text-white font-bold">Editar Suscripción</h3>
                        <p className="text-zinc-500 text-xs font-mono">{user.email}</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Package size={12} className="text-indigo-500" /> Plan Asignado
                        </label>
                        <select 
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="Free">Free</option>
                            <option value="Estandar">Estándar</option>
                            <option value="Multisede">Multisede</option>
                            <option value="Premium AI">Premium AI</option>
                        </select>
                    </div>

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

                    <div className="grid grid-cols-2 gap-4">
                        {/* Selector de Trial */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={12} /> Fin de Trial
                            </label>
                            <input 
                                type="date"
                                value={trialDate}
                                onChange={(e) => setTrialDate(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-3 text-xs text-white focus:border-amber-500 outline-none transition-all scheme-dark"
                            />
                        </div>
                        {/* Selector de Suscripción (NUEVO) */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={12} /> Fin Suscripción
                            </label>
                            <input 
                                type="date"
                                value={periodEnd}
                                onChange={(e) => setPeriodEnd(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-3 text-xs text-white focus:border-emerald-500 outline-none transition-all scheme-dark"
                            />
                        </div>
                    </div>

                    <div className="h-px w-full bg-zinc-800/50 my-2"></div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <CreditCard size={12} className="text-indigo-500" /> Ciclo de Facturación
                        </label>
                        <select 
                            value={ciclo}
                            onChange={(e) => setCiclo(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="mensual">Mensual ($30.000)</option>
                            <option value="semestral">Semestral ($160.000)</option>
                            <option value="anual">Anual ($300.000)</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Building2 size={12} className="text-indigo-500" /> Sucursales Adicionales
                        </label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="number"
                                min="0"
                                value={sucursales}
                                onChange={(e) => setSucursales(parseInt(e.target.value) || 0)}
                                className="w-24 bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-center text-white focus:border-indigo-500 outline-none transition-all"
                            />
                            <span className="text-xs text-zinc-500 font-medium">x $10.000 / mes c/u</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-zinc-950/40 border-t border-zinc-800 flex justify-between items-center shrink-0">
                    <button 
                        onClick={() => onDelete(user.id)}
                        className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-400 transition-colors bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 rounded-lg"
                    >
                        <Trash2 size={14} /> ELIMINAR
                    </button>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                        >
                            CANCELAR
                        </button>
                        <button 
                            onClick={() => onSave(user.id, status, trialDate, periodEnd, ciclo, sucursales, plan)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/10"
                        >
                            <Save size={16} /> GUARDAR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}