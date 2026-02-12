import { useState, useMemo } from 'react';
import { 
    Activity, 
    Calendar, 
    ChevronDown, 
    DollarSign, 
    Users, 
    FileText,
    Search,
    ArrowUpRight,
    ArrowDownLeft,
    Trash2,
    Edit3,
    Clock,
    Filter,
    Wallet,
    TrendingUp
} from 'lucide-react';
import type { AuditLog } from '../types';

interface Partner {
    id: string;
    name: string;
    role: string;
    share: number;
}

interface ControlFlujoProps {
    logs: AuditLog[];
    partners: Partner[]; 
}

export default function ControlFlujo({ logs = [], partners = [] }: ControlFlujoProps) {
    const [filterPeriod, setFilterPeriod] = useState<'mes' | 'semestre' | 'anual'>('mes');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showClosingReport, setShowClosingReport] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const years = [2024, 2025, 2026];

    const getLogStyle = (accion: string) => {
        const low = accion.toLowerCase();
        if (low.includes('ingreso') || low.includes('venta')) 
            return { icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
        if (low.includes('gasto') || low.includes('pago')) 
            return { icon: ArrowDownLeft, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
        return { icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' };
    };

    const filteredLogs = useMemo(() => {
        return (logs || []).filter(log => {
            const date = new Date(log.fecha);
            if (date.getFullYear() !== selectedYear) return false;
            const matchText = log.accion.toLowerCase().includes(searchTerm.toLowerCase()) || log.responsable.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchText) return false;
            if (filterPeriod === 'anual') return true;
            if (filterPeriod === 'semestre') return Math.floor(selectedMonth / 6) === Math.floor(date.getMonth() / 6);
            return date.getMonth() === selectedMonth;
        });
    }, [logs, filterPeriod, selectedMonth, selectedYear, searchTerm]);

    const stats = useMemo(() => {
        const income = filteredLogs.filter(l => (l.monto || 0) > 0).reduce((s, l) => s + (l.monto || 0), 0);
        const expenses = filteredLogs.filter(l => (l.monto || 0) < 0).reduce((s, l) => s + Math.abs(l.monto || 0), 0);
        const net = income - expenses;
        const dividends = (partners || []).map(p => ({
            name: p.name,
            share: p.share,
            amount: net * (p.share / 100)
        }));
        return { income, expenses, net, dividends };
    }, [filteredLogs, partners]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Activity className="text-indigo-500" /> Línea de Tiempo
                </h2>
                <button 
                    onClick={() => setShowClosingReport(!showClosingReport)}
                    className="text-sm font-bold px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 transition-all shadow-lg"
                >
                    <FileText size={18} /> {showClosingReport ? 'Ocultar Balance' : 'Ver Balance'}
                </button>
            </div>

            {showClosingReport && (
                <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                    {/* Resumen de Totales - SIEMPRE VISIBLE */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                            <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Ingresos</p>
                            <h3 className="text-2xl font-bold text-white">${stats.income.toLocaleString()}</h3>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                            <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Gastos</p>
                            <h3 className="text-2xl font-bold text-rose-400">${stats.expenses.toLocaleString()}</h3>
                        </div>
                        <div className="bg-zinc-950 border border-emerald-500/30 p-5 rounded-2xl ring-1 ring-emerald-500/20">
                            <p className="text-xs font-bold text-emerald-500 uppercase mb-1">Utilidad Neta</p>
                            <h3 className="text-2xl font-bold text-white">${stats.net.toLocaleString()}</h3>
                        </div>
                    </div>

                    {/* Desglose por Socios */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stats.dividends.length > 0 ? stats.dividends.map((p, i) => (
                            <div key={i} className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex justify-between items-center group hover:border-indigo-500/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><Wallet size={18} /></div>
                                    <div>
                                        <h4 className="text-white font-bold">{p.name}</h4>
                                        <p className="text-[10px] text-zinc-500">Participación: {p.share}%</p>
                                    </div>
                                </div>
                                <h3 className="text-xl font-mono font-bold text-emerald-400">${p.amount.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
                            </div>
                        )) : (
                            <div className="col-span-2 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-amber-500 text-xs text-center">
                                No se detectaron socios en la configuración. El reparto no puede calcularse.
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 sticky top-0 z-20 shadow-2xl backdrop-blur-md">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input type="text" placeholder="Buscar..." className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value as any)} className="bg-zinc-950 text-white border border-zinc-700 p-2 rounded-xl text-sm focus:outline-none">
                        <option value="mes">Mensual</option>
                        <option value="semestre">Semestral</option>
                        <option value="anual">Anual</option>
                    </select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-zinc-950 text-white border border-zinc-700 p-2 rounded-xl text-sm focus:outline-none">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-4 relative">
                <div className="absolute left-6 top-4 bottom-4 w-px bg-zinc-800 hidden md:block"></div>
                {filteredLogs.length > 0 ? filteredLogs.map((log) => {
                    const style = getLogStyle(log.accion);
                    const Icon = style.icon;
                    return (
                        <div key={log.id} className="relative md:pl-14 animate-in slide-in-from-bottom-2 duration-300">
                            <div className={`absolute left-[21px] top-6 w-2 h-2 rounded-full z-10 hidden md:block ${style.color.replace('text', 'bg')}`}></div>
                            <div className={`bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex justify-between items-center transition-all hover:border-zinc-700 ${style.border}`}>
                                <div className="flex gap-4 items-center">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${style.bg} ${style.color}`}><Icon size={20} /></div>
                                    <div>
                                        <p className="text-white text-sm font-bold">{log.responsable} <span className="font-normal text-zinc-500">registró</span> {log.accion}</p>
                                        <p className="text-zinc-400 text-xs mt-0.5">{log.detalle}</p>
                                    </div>
                                </div>
                                {log.monto !== 0 && (
                                    <div className={`font-mono font-bold text-lg ${log.monto > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {log.monto > 0 ? '+' : '-'}${Math.abs(log.monto).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center py-20 text-zinc-600">No hay movimientos registrados.</div>
                )}
            </div>
        </div>
    );
}