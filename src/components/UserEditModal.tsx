
import { useState } from 'react';
import { X } from 'lucide-react';
import type { DashboardUser } from '../types';

interface UserEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: DashboardUser | null;
    onSave: (userId: string, newPlan: string) => void;
}

const UserEditModal = ({ isOpen, onClose, user, onSave }: UserEditModalProps) => {
    const [plan, setPlan] = useState(user?.plan || 'Free');

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
                
                <h2 className="text-xl font-bold text-white mb-1">Editar Usuario</h2>
                <p className="text-sm text-zinc-400 mb-6">Modifica los permisos y suscripción de {user.nombre}.</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 uppercase mb-1.5">Plan de Suscripción</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Free', 'Pro', 'Premium'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPlan(p as any)}
                                    className={`
                                        py-2 px-3 rounded-lg text-sm font-medium border transition-all
                                        ${plan === p 
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' 
                                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                                        }
                                    `}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={() => {
                                onSave(user.id, plan);
                                onClose();
                            }}
                            className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors font-medium shadow-lg shadow-indigo-900/20"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserEditModal;
