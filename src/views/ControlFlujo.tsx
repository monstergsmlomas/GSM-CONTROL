import { useState, useMemo } from 'react';
import { 
    Activity, 
    FileText,
    Search,
    ArrowUpRight,
    ArrowDownLeft,
    Wallet,
    UserPlus,
    RefreshCw
} from 'lucide-react';
import type { AuditLog, Partner } from '../types';

interface ControlFlujoProps {
    logs: AuditLog[];
    partners?: Partner[]; 
}

export default function ControlFlujo({ logs = [], partners = [] }: ControlFlujoProps) {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showClosingReport, setShowClosingReport] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const years = [2024, 2025, 2026];

    // Lógica Visual Mejorada
    const getLogDisplay = (accion: string, monto: number) => {
        const low = accion.toLowerCase();
        
        // Ingresos Monetarios Reales
        if (monto > 0) {
            return { icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'Registró ingreso' };
        }
        
        // Gastos o Ajustes Negativos
        if (monto < 0) {
            return { icon: ArrowDownLeft, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'Realizó un ajuste' };
        }

        // Acciones Administrativas (Sin dinero)
        if (low.includes('nuevo usuario') || low.includes('registro')) {
            return { icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'Nueva Alta' };
        }
        if (low.includes('plan') || low.includes('cambio')) {
            return { icon: RefreshCw, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'Actualización' };
        }

        // Default
        return { icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'Actividad' };
    };

    const filteredLogs = useMemo(() => {
        return (logs || []).filter(log => {
            const date = new Date(log.fecha);
            if (date.getFullYear() !== selectedYear) return false;
            if (!log.accion.toLowerCase().includes(searchTerm.toLowerCase()) && 
                !log.responsable.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true; 
        });
    }, [logs, selectedYear, searchTerm]);

    const stats = useMemo(() => {
        const totalIncome = filteredLogs.filter(l => (l.monto || 0) > 0).reduce((acc, l) => acc + l.monto, 0);
        const totalExpenses = filteredLogs.filter(l => (l.monto || 0) < 0).reduce((acc, l) => acc + Math.abs(l.monto), 0);
        const netUtility = totalIncome - totalExpenses; // Utilidad real

        const dividends = (partners || []).map(p => ({
            name: p.name,
            share: p.share,
            amount: netUtility * (p.share / 100)
        }));

        return { netUtility, totalIncome, totalExpenses, dividends };
    }, [filteredLogs, partners]);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10 animate-in fade-in duration-500">
            {/* CABECERA */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Activity className="text-indigo-500" /> Línea de Tiempo
                </h2>
                <button 
                    onClick={() => setShowClosingReport(!showClosingReport)}
                    className="text-sm font-bold px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                >
                    <FileText size={18} /> {showClosingReport ? 'Ocultar Balance' : 'Ver Balance'}
                </button>
            </div>

            {/* REPORTE DE CIERRE */}
            {showClosingReport && (
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-6 animate-in slide-in-from-top-4">
                    {/* Totales */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                            <p className="text-zinc-500 text-xs font-bold uppercase">Ingresos Totales</p>
                            <p className="text-2xl font-bold text-emerald-400">+${stats.totalIncome.toLocaleString()}</p>
                        </div>
                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                             <p className="text-zinc-500 text-xs font-bold uppercase">Gastos / Ajustes</p>
                             <p className="text-2xl font-bold text-rose-400">-${stats.totalExpenses.toLocaleString()}</p>
                        </div>
                        <div className="bg-zinc-950 p-4 rounded-xl border border-indigo-500/30 ring-1 ring-indigo-500/20">
                             <p className="text-indigo-400 text-xs font-bold uppercase">Utilidad Neta</p>
                             <p className="text-2xl font-bold text-white">${stats.netUtility.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="h-px bg-zinc-800" />

                    {/* Reparto Socios */}
                    <div>
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Wallet size={18} className="text-amber-500"/> Reparto de Utilidades</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stats.dividends.map((p, i) => (
                                <div key={i} className="bg-zinc-900 border border-zinc-700 p-5 rounded-xl flex justify-between items-center relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-3 opacity-5"><Wallet size={60} /></div>
                                    <div className="relative z-10">
                                        <h4 className="text-white font-bold text-lg">{p.name}</h4>
                                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                            {p.share}% Participación
                                        </span>
                                    </div>
                                    <div className="relative z-10 text-right">
                                        <p className="text-emerald-400 font-mono font-bold text-xl">
                                            ${p.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </p>
                                        <p className="text-[10px] text-zinc-500">Dividendo Estimado</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* FILTROS */}
            <div className="flex gap-3 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 backdrop-blur-sm sticky top-0 z-30 shadow-xl">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar movimiento, responsable..." 
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 pl-10 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
                    className="bg-zinc-950 text-white border border-zinc-700 p-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            {/* FEED */}
            <div className="space-y-4 relative">
                <div className="absolute left-6 top-4 bottom-4 w-px bg-zinc-800 hidden md:block"></div>
                {filteredLogs.map((log) => {
                    const display = getLogDisplay(log.accion, log.monto || 0);
                    const Icon = display.icon;
                    return (
                        <div key={log.id} className="relative md:pl-14 group animate-in slide-in-from-bottom-2 duration-300">
                            <div className={`absolute left-[21px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full z-10 hidden md:block border-2 border-[#09090b] ${display.bg.replace('/10', '')} ${display.color}`}></div>
                            
                            <div className={`bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex justify-between items-center transition-all hover:border-zinc-700 hover:shadow-lg hover:translate-x-1 ${display.border}`}>
                                <div className="flex gap-4 items-center">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${display.bg} ${display.color}`}>
                                        <Icon size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-base">{display.text}</span>
                                            <span className="text-zinc-500 text-xs">• {new Date(log.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span> 
                                        </div>
                                        <p className="text-zinc-400 text-sm mt-0.5">
                                            <span className="text-zinc-300 font-medium">{log.responsable}</span>: {log.detalle}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="text-right">
                                    {log.monto !== 0 && (
                                        <div className={`font-mono font-bold text-lg ${log.monto > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {log.monto > 0 ? '+' : ''}${Math.abs(log.monto).toLocaleString()}
                                        </div>
                                    )}
                                    <div className="text-[10px] text-zinc-600 font-mono mt-1">ID: {log.id.slice(-6)}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {filteredLogs.length === 0 && (
                    <div className="text-center py-12 text-zinc-500 italic">No se encontraron actividades.</div>
                )}
            </div>
        </div>
    );
}
