import { useState, useEffect } from 'react';
import { 
    Settings, Shield, Save, Key, User, 
    CheckCircle2, Database, Edit2, X, Check, PieChart, AlertTriangle 
} from 'lucide-react';
import type { Partner } from '../types';

interface ConfiguracionProps {
    onSave: (data: any) => void;
    initialPartners?: Partner[];
}

export default function Configuracion({ onSave, initialPartners }: ConfiguracionProps) {
    // --- ESTADOS ---
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Socios: Usamos props o default, pero NO permitimos agregar/quitar
    const [partners, setPartners] = useState<Partner[]>(initialPartners || [
        { id: '1', name: 'Socio 1', role: 'Socio Principal', share: 50 },
        { id: '2', name: 'Socio 2', role: 'Socio Principal', share: 50 }
    ]);
    
    // Estado para editar existente
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tempPartner, setTempPartner] = useState<Partner | null>(null);

    // Credenciales & Supabase
    const [credentials, setCredentials] = useState({ username: 'Admin', currentPassword: '', newPassword: '' });
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');

    // Cálculo del total de acciones (Validación visual)
    const totalShares = partners.reduce((sum, p) => sum + (editingId === p.id && tempPartner ? tempPartner.share : p.share), 0);
    const isShareValid = Math.abs(totalShares - 100) < 0.1; // Tolerancia pequeña para decimales

    // Carga inicial de datos guardados
    useEffect(() => {
        const savedUrl = localStorage.getItem('supabase_url');
        const savedKey = localStorage.getItem('supabase_key');
        if (savedUrl) setSupabaseUrl(savedUrl);
        if (savedKey) setSupabaseKey(savedKey);
    }, []);

    // Funciones de Edición
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

    const handleSaveAll = () => {
        if (!isShareValid) {
            alert("Error: El total de participación debe ser exactamente 100%");
            return;
        }

        setLoading(true);
        localStorage.setItem('supabase_url', supabaseUrl);
        localStorage.setItem('supabase_key', supabaseKey);
        
        // Simulación de guardado seguro
        setTimeout(() => {
            setLoading(false);
            setSuccess(true);
            onSave({ 
                credentials, 
                partners, 
                supabase: { url: supabaseUrl, key: supabaseKey } 
            });
            setTimeout(() => setSuccess(false), 3000);
        }, 800);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
            <div>
                 <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Settings className="text-indigo-500" /> Configuración Integral
                 </h2>
                 <p className="text-zinc-400 font-mono text-sm mt-1 opacity-80">{'>'} Administración de socios, seguridad y base de datos.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. GESTIÓN DE SOCIOS Y REPARTO */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg flex flex-col">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg"><PieChart className="text-emerald-500" size={20} /></div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Socios & Dividendos</h3>
                                <p className="text-xs text-zinc-500">Definición de estructura societaria.</p>
                            </div>
                        </div>
                        {/* Indicador de Total % */}
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors flex items-center gap-2 ${isShareValid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'}`}>
                            {!isShareValid && <AlertTriangle size={12} />}
                            Total: {totalShares}%
                        </div>
                    </div>

                    <div className="space-y-3 flex-1">
                        {partners.map((partner) => (
                            <div key={partner.id} className="flex items-center gap-3 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                                {/* Avatar con Iniciales */}
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-sm font-bold text-zinc-300 border border-zinc-700 shrink-0 shadow-inner">
                                    {partner.name.substring(0,2).toUpperCase()}
                                </div>

                                {editingId === partner.id && tempPartner ? (
                                    // --- MODO EDICIÓN ---
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
                                                placeholder="Rol (ej. Gerente)"
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
                                    // --- MODO VISUALIZACIÓN ---
                                    <>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-zinc-200">{partner.name}</p>
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium">{partner.role}</p>
                                        </div>
                                        
                                        {/* Badge de Porcentaje */}
                                        <div className="flex flex-col items-end mr-2">
                                            <div className="font-mono text-white font-bold text-sm bg-zinc-900 px-2 py-1 rounded border border-zinc-800 min-w-[3rem] text-center shadow-sm">
                                                {partner.share}%
                                            </div>
                                        </div>

                                        {/* Botones de Acción (Solo Editar) */}
                                        <div className="flex gap-1 border-l border-zinc-800 pl-2">
                                            <button onClick={() => startEditing(partner)} className="text-zinc-500 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors" title="Editar datos"><Edit2 size={16} /></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 p-3 bg-zinc-950/50 rounded-lg border border-zinc-800 text-xs text-zinc-500 text-center">
                        <p>Solo se permiten 2 socios principales en este plan.</p>
                    </div>
                </div>

                {/* 2. CREDENCIALES (Seguridad) */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
                        <div className="p-2 bg-indigo-500/10 rounded-lg"><Shield className="text-indigo-500" size={20} /></div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Credenciales Maestras</h3>
                            <p className="text-xs text-zinc-500">Acceso administrativo del sistema.</p>
                        </div>
                    </div>
                    <div className="space-y-5">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-1.5 flex items-center gap-2"><User size={12} /> Usuario Principal</label>
                            <input type="text" value={credentials.username} onChange={(e) => setCredentials({...credentials, username: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2.5 focus:border-indigo-500 focus:outline-none transition-colors" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1.5">Contraseña Actual</label><input type="password" value={credentials.currentPassword} onChange={(e) => setCredentials({...credentials, currentPassword: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2.5 focus:border-indigo-500 focus:outline-none transition-colors" /></div>
                            <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1.5">Nueva Contraseña</label><input type="password" value={credentials.newPassword} onChange={(e) => setCredentials({...credentials, newPassword: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2.5 focus:border-indigo-500 focus:outline-none transition-colors" /></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. CONEXIÓN BASE DE DATOS (Supabase) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-indigo-500/10 transition-colors duration-500"></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2 bg-indigo-500/10 rounded-lg"><Database className="text-indigo-500" size={20} /></div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Base de Datos (Nube)</h3>
                        <p className="text-xs text-zinc-500">Configuración de conexión persistente.</p>
                    </div>
                </div>
                <div className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Supabase URL</label>
                            <input type="text" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2.5 px-4 text-zinc-200 focus:border-indigo-500 focus:outline-none transition-colors" placeholder="https://xyz.supabase.co" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Supabase Anon Key</label>
                            <input type="password" value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2.5 px-4 text-zinc-200 font-mono focus:border-indigo-500 focus:outline-none transition-colors" />
                        </div>
                    </div>
                </div>
            </div>

            {/* BOTÓN FLOTANTE DE GUARDADO */}
            <div className="flex justify-end pt-4 sticky bottom-6 z-20">
                <button onClick={handleSaveAll} disabled={loading} className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm shadow-xl transition-all transform hover:scale-[1.02] border ${success ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white border-white text-black hover:bg-zinc-200'}`}>
                    {loading ? 'Guardando...' : success ? <><CheckCircle2 size={18} /> ¡Cambios Guardados!</> : <><Save size={18} /> Guardar Configuración</>}
                </button>
            </div>
        </div>
    );
}
