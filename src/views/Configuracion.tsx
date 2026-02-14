import { useState } from 'react';
import { 
    Settings, Shield, Save, Key, User, 
    CheckCircle2, PieChart, AlertTriangle, Edit2, Check, X, MessageCircle, Target, Bell 
} from 'lucide-react';
import type { Partner } from '../types';

interface ConfiguracionProps {
    onSave: (data: any) => void;
    initialPartners?: Partner[];
    initialWhatsappTemplate?: string;
    initialMrrTarget?: number;
    initialAlertThreshold?: number; // NUEVA PROP
}

export default function Configuracion({ onSave, initialPartners, initialWhatsappTemplate, initialMrrTarget, initialAlertThreshold }: ConfiguracionProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [partners, setPartners] = useState<Partner[]>(initialPartners || [
        { id: '1', name: 'Rodrigo', role: 'Socio Principal', share: 50 },
        { id: '2', name: 'Tomy', role: 'Socio Fundador', share: 50 }
    ]);
    
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tempPartner, setTempPartner] = useState<Partner | null>(null);

    const [selectedUserForPin, setSelectedUserForPin] = useState('Rodrigo');
    const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
    const [pinMessage, setPinMessage] = useState({ type: '', text: '' });

    const [whatsappTemplate, setWhatsappTemplate] = useState(initialWhatsappTemplate || '');
    const [mrrTarget, setMrrTarget] = useState<number>(initialMrrTarget || 1000000);
    
    // NUEVO: ESTADO PARA LA ALERTA
    const [alertThreshold, setAlertThreshold] = useState<number>(initialAlertThreshold || 48);

    const totalShares = partners.reduce((sum, p) => sum + (editingId === p.id && tempPartner ? tempPartner.share : p.share), 0);
    const isShareValid = Math.abs(totalShares - 100) < 0.1;

    const startEditing = (partner: Partner) => {
        setEditingId(partner.id);
        setTempPartner({ ...partner });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setTempPartner(null);
    };

    const saveEditing = () => {
        if (!tempPartner || !tempPartner.name.trim()) return;
        setPartners(partners.map(p => p.id === editingId ? { ...tempPartner } : p));
        setEditingId(null);
        setTempPartner(null);
    };

    const handleUpdatePin = () => {
        setPinMessage({ type: '', text: '' });

        if (!pinForm.newPin || pinForm.newPin.length < 4) {
            setPinMessage({ type: 'error', text: 'El nuevo PIN debe tener al menos 4 caracteres.' });
            return;
        }

        if (pinForm.newPin !== pinForm.confirmPin) {
            setPinMessage({ type: 'error', text: 'Los nuevos PINs no coinciden.' });
            return;
        }

        const savedPin = localStorage.getItem(`pin_${selectedUserForPin}`) || '1234';
        
        if (pinForm.currentPin !== savedPin) {
            setPinMessage({ type: 'error', text: 'El PIN actual es incorrecto.' });
            return;
        }

        localStorage.setItem(`pin_${selectedUserForPin}`, pinForm.newPin);
        setPinMessage({ type: 'success', text: `PIN de ${selectedUserForPin} actualizado con éxito.` });
        setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
    };

    const handleSaveAll = () => {
        if (!isShareValid) {
            alert("Error: El total de participación debe ser exactamente 100%");
            return;
        }

        setLoading(true);
        
        setTimeout(() => {
            setLoading(false);
            setSuccess(true);
            // ENVIAMOS alertThreshold PARA QUE SE GUARDE
            onSave({ partners, whatsappTemplate, mrrTarget, alertThreshold }); 
            setTimeout(() => setSuccess(false), 3000);
        }, 800);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
            <div>
                 <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Settings className="text-indigo-500" /> Centro de Configuración
                 </h2>
                 <p className="text-zinc-400 font-mono text-sm mt-1 opacity-80">{'>'} Administración de socios, seguridad y métricas.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. GESTIÓN DE SOCIOS Y REPARTO */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg flex flex-col">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg"><PieChart className="text-emerald-500" size={20} /></div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Socios & Dividendos</h3>
                                <p className="text-xs text-zinc-500">Estructura para el Control de Flujo.</p>
                            </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors flex items-center gap-2 ${isShareValid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'}`}>
                            {!isShareValid && <AlertTriangle size={12} />}
                            Total: {totalShares}%
                        </div>
                    </div>

                    <div className="space-y-3 flex-1">
                        {partners.map((partner) => (
                            <div key={partner.id} className="flex items-center gap-3 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-sm font-bold text-zinc-300 border border-zinc-700 shrink-0 shadow-inner">
                                    {partner.name.substring(0,2).toUpperCase()}
                                </div>

                                {editingId === partner.id && tempPartner ? (
                                    <div className="flex-1 flex gap-2 items-center animate-in fade-in duration-200">
                                        <div className="flex-1 space-y-1">
                                            <input 
                                                autoFocus
                                                className="w-full bg-zinc-900 border border-indigo-500 text-white text-sm rounded px-2 py-1 focus:outline-none placeholder-zinc-600"
                                                placeholder="Nombre"
                                                value={tempPartner.name}
                                                onChange={(e) => setTempPartner({...tempPartner, name: e.target.value})}
                                            />
                                            <input 
                                                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-400 text-xs rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                                                placeholder="Rol"
                                                value={tempPartner.role}
                                                onChange={(e) => setTempPartner({...tempPartner, role: e.target.value})}
                                            />
                                        </div>
                                        <div className="relative w-20">
                                            <input 
                                                type="number"
                                                className="w-full bg-zinc-900 border border-indigo-500 text-white text-sm rounded px-2 py-1 focus:outline-none text-right pr-6 font-mono"
                                                value={tempPartner.share}
                                                onChange={(e) => setTempPartner({...tempPartner, share: Number(e.target.value)})}
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">%</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button onClick={saveEditing} className="text-emerald-500 p-1 hover:bg-emerald-500/10 rounded"><Check size={16} /></button>
                                            <button onClick={cancelEditing} className="text-red-500 p-1 hover:bg-red-500/10 rounded"><X size={16} /></button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-zinc-200">{partner.name}</p>
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium">{partner.role}</p>
                                        </div>
                                        <div className="flex flex-col items-end mr-2">
                                            <div className="font-mono text-white font-bold text-sm bg-zinc-900 px-2 py-1 rounded border border-zinc-800 min-w-[3rem] text-center shadow-sm">
                                                {partner.share}%
                                            </div>
                                        </div>
                                        <div className="flex gap-1 border-l border-zinc-800 pl-2">
                                            <button onClick={() => startEditing(partner)} className="text-zinc-500 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors" title="Editar datos"><Edit2 size={16} /></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-800">
                        <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <Target size={12} /> Meta de Ingresos Mensual (MRR Target)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                            <input 
                                type="number" 
                                value={mrrTarget}
                                onChange={(e) => setMrrTarget(Number(e.target.value))}
                                className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg pl-8 pr-4 py-3 focus:border-emerald-500 focus:outline-none transition-colors font-mono" 
                            />
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-2">Esta meta se reflejará en la barra de progreso de la pestaña Métricas.</p>
                    </div>
                </div>

                {/* 2. SEGURIDAD DE ACCESOS */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
                        <div className="p-2 bg-indigo-500/10 rounded-lg"><Shield className="text-indigo-500" size={20} /></div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Seguridad de Acceso</h3>
                            <p className="text-xs text-zinc-500">Gestión de PINs de los operadores.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-1.5">
                                <User size={12} /> Modificar PIN para
                            </label>
                            <select 
                                value={selectedUserForPin}
                                onChange={(e) => {
                                    setSelectedUserForPin(e.target.value);
                                    setPinMessage({ type: '', text: '' });
                                }}
                                className="w-full bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg px-3 py-3 focus:border-indigo-500 focus:outline-none transition-colors appearance-none cursor-pointer"
                            >
                                <option value="Rodrigo">👤 Rodrigo</option>
                                <option value="Tomy">👤 Tomy</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                PIN Actual
                            </label>
                            <input 
                                type="password" 
                                placeholder="••••"
                                value={pinForm.currentPin} 
                                onChange={(e) => setPinForm({...pinForm, currentPin: e.target.value})} 
                                className="w-full bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2.5 focus:border-indigo-500 focus:outline-none transition-colors text-center tracking-[0.5em]" 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">Nuevo PIN</label>
                                <input 
                                    type="password" 
                                    placeholder="••••"
                                    value={pinForm.newPin} 
                                    onChange={(e) => setPinForm({...pinForm, newPin: e.target.value})} 
                                    className="w-full bg-zinc-950 border border-emerald-500/50 text-white text-sm rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none transition-colors text-center tracking-[0.5em]" 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">Confirmar</label>
                                <input 
                                    type="password" 
                                    placeholder="••••"
                                    value={pinForm.confirmPin} 
                                    onChange={(e) => setPinForm({...pinForm, confirmPin: e.target.value})} 
                                    className="w-full bg-zinc-950 border border-emerald-500/50 text-white text-sm rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:outline-none transition-colors text-center tracking-[0.5em]" 
                                />
                            </div>
                        </div>

                        {pinMessage.text && (
                            <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${pinMessage.type === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                {pinMessage.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                                {pinMessage.text}
                            </div>
                        )}

                        <button 
                            onClick={handleUpdatePin}
                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
                        >
                            <Key size={16} /> ACTUALIZAR PIN
                        </button>
                    </div>
                </div>

                {/* 3. COMUNICACIONES Y ALERTAS (Rediseñado en 2 columnas) */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg lg:col-span-2">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
                        <div className="p-2 bg-amber-500/10 rounded-lg"><Bell className="text-amber-500" size={20} /></div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Comunicaciones y Alertas</h3>
                            <p className="text-xs text-zinc-500">Reglas de automatización para avisos y mensajería.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Selector de Horas */}
                        <div>
                            <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                                <Bell size={12} /> Activar etiqueta "URGENTE" a las:
                            </label>
                            <select 
                                value={alertThreshold}
                                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                                className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-4 py-3 focus:border-amber-500 focus:outline-none transition-colors appearance-none cursor-pointer"
                            >
                                <option value={24}>24 Horas antes del vencimiento</option>
                                <option value={48}>48 Horas antes del vencimiento</option>
                                <option value={72}>72 Horas (3 días) antes</option>
                                <option value={120}>120 Horas (5 días) antes</option>
                                <option value={168}>168 Horas (1 semana) antes</option>
                            </select>
                            <p className="text-[10px] text-zinc-500 mt-2">
                                Cuando un cliente entre en este margen de tiempo, su nombre titilará en amarillo en la lista de usuarios.
                            </p>
                        </div>

                        {/* Plantilla WhatsApp */}
                        <div>
                            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                                <MessageCircle size={12} /> Plantilla Base de WhatsApp
                            </label>
                            <textarea 
                                value={whatsappTemplate}
                                onChange={(e) => setWhatsappTemplate(e.target.value)}
                                className="w-full h-24 bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-4 py-3 focus:border-emerald-500 focus:outline-none transition-colors resize-none leading-relaxed"
                                placeholder="Escribe tu mensaje aquí..."
                            />
                            <div className="flex gap-2 mt-2 flex-wrap">
                                <span className="px-1.5 py-0.5 bg-zinc-800/50 rounded text-[10px] font-bold text-indigo-400 border border-zinc-700">{'{nombre}'}</span>
                                <span className="px-1.5 py-0.5 bg-zinc-800/50 rounded text-[10px] font-bold text-emerald-400 border border-zinc-700">{'{plan}'}</span>
                                <span className="px-1.5 py-0.5 bg-zinc-800/50 rounded text-[10px] font-bold text-amber-400 border border-zinc-700">{'{estado}'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 sticky bottom-6 z-20">
                <button onClick={handleSaveAll} disabled={loading} className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm shadow-xl transition-all transform hover:scale-[1.02] border ${success ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white border-white text-black hover:bg-zinc-200'}`}>
                    {loading ? 'Guardando...' : success ? <><CheckCircle2 size={18} /> ¡Configuración Guardada!</> : <><Save size={18} /> Guardar Cambios Generales</>}
                </button>
            </div>
        </div>
    );
}