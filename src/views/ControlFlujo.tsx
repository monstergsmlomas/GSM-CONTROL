import { useState, useMemo } from 'react';
import { 
    Activity, 
    FileText,
    Search,
    ArrowUpRight,
    ArrowDownLeft,
    Wallet,
    UserPlus,
    RefreshCw,
    AlertCircle,
    Calendar,
    TrendingUp
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

    // Rango de años dinámico basado en la actualidad
    const years = [2024, 2025, 2026];

    // Lógica Visual para identificar tipos de actividad de GSM FIX
    const getLogDisplay = (accion: string, monto: number) => {
        const low = accion.toLowerCase();
        
        // 1. Movimientos de Dinero (Suscripciones cobradas)
        if (monto > 0) {
            return { icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'Ingreso Percibido' };
        }
        
        // 2. Ajustes o Devoluciones
        if (monto < 0) {
            return { icon: ArrowDownLeft, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'Ajuste de Caja' };
        }

        // 3. Eventos Críticos de GSM FIX (Sin monto)
        if (low.includes('vencido') || low.includes('expirado')) {
            return { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/40', text: 'Suscripción Vencida' };
        }
        if (low.includes('nuevo usuario') || low.includes('registro')) {
            return { icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'Nueva Alta' };
        }
        if (low.includes('plan') || low.includes('upgrade') || low.includes('renovación')) {
            return { icon: RefreshCw, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'Cambio de Plan' };
        }

        // Default: Actividad general
        return { icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'Actividad' };
    };

    const filteredLogs = useMemo(() => {
        return (logs || []).filter(log => {
            const date = new Date(log.fecha);
            const matchesYear = date.getFullYear() === selectedYear;
            const matchesSearch = 
                log.accion.toLowerCase().includes(searchTerm.toLowerCase()) || 
                log.responsable.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.detalle?.toLowerCase().includes(searchTerm.toLowerCase());
            
            return matchesYear && matchesSearch;
        });
    }, [logs, selectedYear, searchTerm]);

    const stats = useMemo(() => {
        const totalIncome = filteredLogs.filter(l => (l.monto || 0) > 0).reduce((acc, l) => acc + (l.monto || 0), 0);
        const totalExpenses = filteredLogs.filter(l => (l.monto || 0) < 0).reduce((acc, l) => acc + Math.abs(l.monto || 0), 0);
        const netUtility = totalIncome - totalExpenses;

        const dividends = (partners || []).map(p => ({
            name: p.name,
            share: p.share,
            amount: netUtility > 0 ? netUtility * (p.share / 100) : 0
        }));

        return { netUtility, totalIncome, totalExpenses, dividends };
    }, [filteredLogs, partners]);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10 animate-in fade-in duration-500">
            {/* CABECERA CON CONTEXTO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-indigo-500" /> Línea de Tiempo de Operaciones
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1">Monitoreo de auditoría y flujo de caja en tiempo real.</p>
                </div>
                <button 
                    onClick={() => setShowClosingReport(!showClosingReport)}
                    className={`text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg ${
                        showClosingReport 
                        ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                    }`}
                >
                    <FileText size={18} /> {showClosingReport ? 'Ocultar Balance' : 'Ver Balance Financiero'}
                </button>
            </div>

            {/* BALANCE FINANCIERO */}
            {showClosingReport && (
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 hover:border-emerald-500/30 transition-colors group">
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Ingresos Totales</p>
                            <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">+${stats.totalIncome.toLocaleString()}</p>
                        </div>
                        <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 hover:border-rose-500/30 transition-colors">
                             <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Gastos / Ajustes</p>
                             <p className="text-2xl font-mono font-bold text-rose-400 mt-1">-${stats.totalExpenses.toLocaleString()}</p>
                        </div>
                        <div className="bg-zinc-950 p-4 rounded-xl border border-indigo-500/30 ring-1 ring-indigo-500/20 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-2 opacity-10"><TrendingUp size={40} className="text-indigo-500" /></div>
                             <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest">Utilidad Neta Real</p>
                             <p className="text-2xl font-mono font-bold text-white mt-1">${stats.netUtility.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="h-px bg-zinc-800" />

                    {/* Reparto Socios */}
                    <div>
                        <h3 className="text-zinc-300 text-sm font-bold mb-4 flex items-center gap-2">
                            <Wallet size={16} className="text-amber-500"/> Reparto Estimado de Utilidades
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stats.dividends.map((p, i) => (
                                <div key={i} className="bg-zinc-950/40 border border-zinc-800 p-5 rounded-xl flex justify-between items-center group hover:bg-zinc-900/60 transition-all">
                                    <div>
                                        <h4 className="text-white font-bold text-lg">{p.name}</h4>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                            PARTICIPACIÓN: {p.share}%
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-emerald-400 font-mono font-bold text-xl">
                                            ${p.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </p>
                                        <p className="text-[10px] text-zinc-600 uppercase font-bold">Dividendo</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* FILTROS STICKY */}
            <div className="flex flex-col sm:flex-row gap-3 bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 backdrop-blur-md sticky top-4 z-30 shadow-2xl">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar movimiento, responsable, detalle..." 
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 pl-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
                            className="bg-zinc-950 text-white border border-zinc-700 py-2 pl-9 pr-4 rounded-xl text-sm focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none hover:bg-zinc-900 transition-colors"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* FEED DE ACTIVIDAD */}
            <div className="space-y-4 relative">
                {/* Línea vertical de tiempo */}
                <div className="absolute left-6 top-4 bottom-4 w-px bg-zinc-800 hidden md:block opacity-50"></div>
                
                {filteredLogs.map((log) => {
                    const display = getLogDisplay(log.accion, log.monto || 0);
                    const Icon = display.icon;
                    return (
                        <div key={log.id} className="relative md:pl-14 group">
                            {/* Punto de la línea de tiempo */}
                            <div className={`absolute left-[21px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-10 hidden md:block border-2 border-zinc-950 transition-transform group-hover:scale-125 ${display.color.replace('text', 'bg')}`}></div>
                            
                            <div className={`bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl flex justify-between items-center transition-all hover:bg-zinc-900/80 hover:border-zinc-700 hover:shadow-xl ${display.border}`}>
                                <div className="flex gap-4 items-center">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${display.bg} ${display.color}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-zinc-100 text-sm sm:text-base leading-none">{display.text}</span>
                                            <span className="text-zinc-600 text-[10px] font-mono tracking-tighter bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                                                {new Date(log.fecha).toLocaleDateString()} • {new Date(log.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span> 
                                        </div>
                                        <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                                            <span className="text-indigo-400 font-bold">{log.responsable}</span> 
                                            <span className="text-zinc-500 mx-1">→</span>
                                            {log.detalle}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="text-right shrink-0">
                                    {log.monto !== 0 && (
                                        <div className={`font-mono font-bold text-sm sm:text-lg ${log.monto > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {log.monto > 0 ? '+' : ''}${Math.abs(log.monto || 0).toLocaleString()}
                                        </div>
                                    )}
                                    <div className="text-[9px] text-zinc-700 font-mono mt-1 group-hover:text-zinc-500 transition-colors uppercase tracking-widest">
                                        ID: {log.id.slice(-6)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {filteredLogs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-3xl">
                        <Search size={40} className="text-zinc-700 mb-4" />
                        <p className="text-zinc-500 font-medium italic">Sin registros para el criterio seleccionado.</p>
                    </div>
                )}
            </div>
        </div>
    );
}