import { useState, useEffect } from 'react';
import { 
    Settings, Shield, Save, Key, User, 
    CheckCircle2, PieChart, AlertTriangle, Edit2, Check, X, MessageCircle, Target, Bell,
    Send
} from 'lucide-react';
import type { Partner } from '../types';

interface ConfiguracionProps {
    onSave: (data: any) => void;
    initialPartners?: Partner[];
    initialWhatsappTemplate?: string;
    initialMrrTarget?: number;
    initialAlertThreshold?: number;
}

export default function Configuracion({ onSave, initialPartners, initialMrrTarget, initialAlertThreshold }: ConfiguracionProps) {
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

    const [mrrTarget, setMrrTarget] = useState<number>(initialMrrTarget || 1000000);
    const [alertThreshold, setAlertThreshold] = useState<number>(initialAlertThreshold || 48);

    // NUEVOS ESTADOS PRO BOT
    const [botEnabled, setBotEnabled] = useState(false);
    const [templateWelcome, setTemplateWelcome] = useState("");
    const [templateReminder48h, setTemplateReminder48h] = useState("");
    const [templateTrialEnded, setTemplateTrialEnded] = useState("");

    useEffect(() => {
        const fetchBotSettings = async () => {
            try {
                const res = await fetch('/api/bot-settings');
                if (!res.ok) {
                    console.warn("⚠️ No se pudo cargar la configuración del bot. ¿La tabla existe?");
                    return;
                }
                const data = await res.json();
                if (data && !data.error) {
                    // CORRECCIÓN: Ahora lee correctamente los nombres tal cual están en la base de datos
                    setBotEnabled(data.isEnabled ?? data.is_enabled ?? false);
                    setTemplateWelcome(data.welcomeMessage ?? data.welcome_message ?? "");
                    setTemplateReminder48h(data.reminderMessage ?? data.reminder_message ?? "");
                    setTemplateTrialEnded(data.trialEndedMessage ?? data.trial_ended_message ?? "");
                }
            } catch (error) {
                console.error("Error fetching bot settings:", error);
            }
        };
        fetchBotSettings();
    }, []);

    const totalShares = partners.reduce((sum: number, p: Partner) => sum + (editingId === p.id && tempPartner ? tempPartner.share : p.share), 0);
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
        setPartners(partners.map((p: Partner) => p.id === editingId ? { ...tempPartner } : p));
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

    const handleSaveAll = async () => {
        if (!isShareValid) {
            alert("Error: El total de participación debe ser exactamente 100%");
            return;
        }

        setLoading(true);
        
        try {
            // 1. Guardar Config Básica (props)
            onSave({ partners, mrrTarget, alertThreshold });

            // 2. Guardar Ajustes del Bot Pro
            const res = await fetch('/api/bot-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // CORRECCIÓN: Enviamos los nombres correctos a la base de datos
                    isEnabled: botEnabled,
                    welcomeMessage: templateWelcome,
                    reminderMessage: templateReminder48h,
                    trialEndedMessage: templateTrialEnded
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Error del servidor (${res.status})`);
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error: any) {
            console.error("Error al guardar ajustes:", error);
            alert(`⚠️ No se guardaron los ajustes del bot:\n\n${error.message}`);
        } finally {
            setLoading(false);
        }
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
                        {partners.map((partner: Partner) => (
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

                {/* 3. COMUNICACIONES Y ALERTAS (Rediseño Premium) */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg lg:col-span-2 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none" />
                    
                    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-zinc-800 relative z-10">
                        <div className="p-2 bg-amber-500/10 rounded-lg"><Bell className="text-amber-500" size={20} /></div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Comunicaciones y Alertas</h3>
                            <p className="text-xs text-zinc-500 font-medium">Gestiona la inteligencia de tu bot y reglas de aviso.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                        {/* Columna Izquierda: Configuración Base */}
                        <div className="space-y-8">
                            <div>
                                <label className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                                    <Bell size={12} className="animate-pulse" /> Alerta Visual de Vencimiento
                                </label>
                                <div className="bg-zinc-950/40 p-1 rounded-xl border border-zinc-800/80">
                                    <select 
                                        value={alertThreshold}
                                        onChange={(e) => setAlertThreshold(Number(e.target.value))}
                                        className="w-full bg-transparent text-zinc-200 text-sm rounded-lg px-4 py-3.5 focus:outline-none cursor-pointer hover:bg-zinc-800/30 transition-colors appearance-none"
                                    >
                                        <option value={24}>24 Horas antes (Mañana)</option>
                                        <option value={48}>48 Horas antes (2 Días)</option>
                                        <option value={72}>72 Horas antes (3 Días)</option>
                                        <option value={120}>120 Horas (5 días) antes</option>
                                        <option value={168}>168 Horas (1 semana) antes</option>
                                    </select>
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-3 font-medium px-1 italic">
                                    El sistema marcará al usuario en amarillo cuando falte este tiempo para expirar.
                                </p>
                            </div>

                            {/* Tarjeta del Interruptor Maestro Rediseñada */}
                            <div className={`p-5 rounded-2xl border transition-all duration-500 ${botEnabled ? 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_30px_-10px_rgba(16,185,129,0.1)]' : 'bg-zinc-950/60 border-zinc-800/80'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl transition-all duration-500 ${botEnabled ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-zinc-800 text-zinc-500'}`}>
                                            <MessageCircle size={22} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h4 className={`text-sm font-black uppercase tracking-wider transition-colors duration-500 ${botEnabled ? 'text-emerald-400' : 'text-zinc-400'}`}>Motor WhatsApp</h4>
                                            <p className="text-[10px] text-zinc-500 font-bold mt-0.5">ESTADO: {botEnabled ? 'OPERATIVO' : 'DESACTIVADO'}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setBotEnabled(!botEnabled)}
                                        className={`group relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 focus:outline-none p-1 ${botEnabled ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-zinc-800 border border-zinc-700'}`}
                                    >
                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-all duration-300 ${botEnabled ? 'translate-x-7 bg-emerald-400' : 'translate-x-0 bg-zinc-400'}`} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-zinc-800/20 rounded-2xl p-4 border border-zinc-800/50">
                                <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block mb-3 border-b border-zinc-800/50 pb-2">Variables Dinámicas</span>
                                <div className="flex gap-2.5 flex-wrap">
                                    <span className="px-3 py-1 bg-indigo-500/10 rounded-full text-[10px] font-black text-indigo-400 border border-indigo-500/20 select-none hover:bg-indigo-500/20 transition-colors cursor-default">#{'{nombre}'}</span>
                                    <span className="px-3 py-1 bg-emerald-500/10 rounded-full text-[10px] font-black text-emerald-400 border border-emerald-500/20 select-none hover:bg-emerald-500/20 transition-colors cursor-default">#{'{plan}'}</span>
                                    <span className="px-3 py-1 bg-amber-500/10 rounded-full text-[10px] font-black text-amber-400 border border-amber-500/20 select-none hover:bg-amber-500/20 transition-colors cursor-default">#{'{estado}'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha: Plantillas */}
                        <div className="space-y-5">
                            {/* Bienvenida */}
                            <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 hover:border-indigo-500/30 transition-all duration-300">
                                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                                    <Send size={11} /> Mensaje de Bienvenida
                                </label>
                                <textarea 
                                    value={templateWelcome}
                                    onChange={(e) => setTemplateWelcome(e.target.value)}
                                    className="w-full h-24 bg-black/20 text-zinc-300 text-xs rounded-xl px-4 py-3 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none transition-all resize-none leading-relaxed placeholder-zinc-700 border-none"
                                    placeholder="¡Hola {nombre}! Bienvenido a la plataforma..."
                                />
                            </div>

                            {/* Aviso 48hs */}
                            <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 hover:border-amber-500/30 transition-all duration-300">
                                <label className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                                    <Bell size={11} /> Recordatorio (48h antes)
                                </label>
                                <textarea 
                                    value={templateReminder48h}
                                    onChange={(e) => setTemplateReminder48h(e.target.value)}
                                    className="w-full h-24 bg-black/20 text-zinc-300 text-xs rounded-xl px-4 py-3 focus:ring-1 focus:ring-amber-500/30 focus:outline-none transition-all resize-none leading-relaxed placeholder-zinc-700 border-none"
                                    placeholder="Hola {nombre}, tu plan {plan} vence pronto..."
                                />
                            </div>

                            {/* Fin Trial */}
                            <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 hover:border-rose-500/30 transition-all duration-300">
                                <label className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                                    <AlertTriangle size={11} /> Fin de Periodo (Expirado)
                                </label>
                                <textarea 
                                    value={templateTrialEnded}
                                    onChange={(e) => setTemplateTrialEnded(e.target.value)}
                                    className="w-full h-24 bg-black/20 text-zinc-300 text-xs rounded-xl px-4 py-3 focus:ring-1 focus:ring-rose-500/30 focus:outline-none transition-all resize-none leading-relaxed placeholder-zinc-700 border-none"
                                    placeholder="Tu prueba ha finalizado. Actualiza para continuar..."
                                />
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