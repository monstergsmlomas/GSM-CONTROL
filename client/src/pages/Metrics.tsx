import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, DollarSign, CreditCard, Layers, UserPlus, UserMinus } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';

// --- MOCK DATA ---
const financialData = [
    { name: 'Ene', mensual: 4000, semestral: 1500, anual: 2000, total: 7500, altas: 15, bajas: 2 },
    { name: 'Feb', mensual: 4200, semestral: 1000, anual: 3000, total: 8200, altas: 18, bajas: 1 },
    { name: 'Mar', mensual: 4500, semestral: 2500, anual: 1000, total: 8000, altas: 12, bajas: 5 },
    { name: 'Abr', mensual: 4800, semestral: 1500, anual: 4000, total: 10300, altas: 22, bajas: 1 },
    { name: 'May', mensual: 5100, semestral: 3000, anual: 2000, total: 10100, altas: 28, bajas: 3 },
    { name: 'Jun', mensual: 5500, semestral: 3500, anual: 5000, total: 14000, altas: 35, bajas: 2 },
];

const planDistribution = [
    { name: 'Mensual ($10)', value: 120, revenue: 1200, color: '#10b981' },
    { name: 'Semestral ($50)', value: 40, revenue: 2000, color: '#f59e0b' },
    { name: 'Anual ($100)', value: 35, revenue: 3500, color: '#3b82f6' },
];

const Metrics = () => {
    const navigate = useNavigate();
    const [period, setPeriod] = useState('semiannual');
    const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

    // Totales Cards
    const totalMensual = { users: 120, revenue: 5500 };
    const totalSemestral = { users: 40, revenue: 3500 };
    const totalAnual = { users: 35, revenue: 5000 };

    // Datos del Mes Actual (Simulado Junio)
    const currentMonthData = financialData[financialData.length - 1];

    // Configuración de los Anillos (Radial Gauges)
    // Calculamos un "Target" arbitrario para que el anillo se vea lleno parcialmente (ej: meta de 50 altas)
    const altasTarget = 50;
    const altasData = [
        { name: 'Completado', value: currentMonthData.altas, color: '#10b981' }, // Emerald
        { name: 'Restante', value: altasTarget - currentMonthData.altas, color: '#18181b' } // Zinc-900 (Background ring)
    ];

    const bajasTarget = 10; // "Meta" de máximo 10 bajas
    const bajasData = [
        { name: 'Bajas', value: currentMonthData.bajas, color: '#f43f5e' }, // Rose
        { name: 'Restante', value: bajasTarget - currentMonthData.bajas, color: '#18181b' }
    ];

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-6 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <h1 className="text-3xl font-bold tracking-tight text-white">Control Financiero</h1>
                        </div>
                        <p className="text-zinc-400 ml-11">Desglose de ingresos y KPIs mensuales.</p>
                    </div>

                    <div className="flex gap-3">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-700 text-zinc-200">
                                <SelectValue placeholder="Periodo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monthly">Este Mes</SelectItem>
                                <SelectItem value="semiannual">Semestral</SelectItem>
                                <SelectItem value="annual">Anual</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300 bg-zinc-900 hover:bg-zinc-800">Exportar Excel</Button>
                    </div>
                </div>

                {/* 1. CARDS SUPERIORES */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-zinc-900/50 border-zinc-800 border-t-4 border-t-emerald-500 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10"><CreditCard className="w-20 h-20 text-emerald-500" /></div>
                        <CardHeader className="pb-2"><CardTitle className="text-zinc-200 flex items-center gap-2">Plan Mensual</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{formatCurrency(totalMensual.revenue)}</div>
                            <div className="flex items-center justify-between mt-4 text-sm text-zinc-500"><span>{totalMensual.users} Usuarios</span><span>Ticket: $10</span></div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-zinc-800 border-t-4 border-t-amber-500 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10"><Layers className="w-20 h-20 text-amber-500" /></div>
                        <CardHeader className="pb-2"><CardTitle className="text-zinc-200 flex items-center gap-2">Plan Semestral</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{formatCurrency(totalSemestral.revenue)}</div>
                            <div className="flex items-center justify-between mt-4 text-sm text-zinc-500"><span>{totalSemestral.users} Usuarios</span><span>Ticket: $50</span></div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-zinc-800 border-t-4 border-t-blue-500 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10"><DollarSign className="w-20 h-20 text-blue-500" /></div>
                        <CardHeader className="pb-2"><CardTitle className="text-zinc-200 flex items-center gap-2">Plan Anual</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{formatCurrency(totalAnual.revenue)}</div>
                            <div className="flex items-center justify-between mt-4 text-sm text-zinc-500"><span>{totalAnual.users} Usuarios</span><span>Ticket: $100</span></div>
                        </CardContent>
                    </Card>
                </div>

                {/* 2. GRÁFICOS MEDIOS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="bg-zinc-900/50 border-zinc-800 shadow-xl lg:col-span-2">
                        <CardHeader><CardTitle className="text-zinc-200">Composición de Facturación</CardTitle></CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={financialData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} />
                                    <Legend />
                                    <Bar dataKey="mensual" stackId="a" fill="#10b981" barSize={40} name="Mensual" />
                                    <Bar dataKey="semestral" stackId="a" fill="#f59e0b" barSize={40} name="Semestral" />
                                    <Bar dataKey="anual" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} name="Anual" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900/50 border-zinc-800 shadow-xl">
                        <CardHeader><CardTitle className="text-zinc-200">Volumen de Usuarios</CardTitle></CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {planDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900/50 border-zinc-800 shadow-xl lg:col-span-3">
                        <CardHeader><CardTitle className="text-zinc-200">Tendencia de Ingresos Totales</CardTitle></CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={financialData}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} />
                                    <Area type="monotone" dataKey="total" stroke="#10b981" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. NUEVOS GRÁFICOS RADIALES (ALTAS Y BAJAS) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Gráfico Radial: Altas (Verde) */}
                    <Card className="bg-zinc-900/50 border-zinc-800 shadow-xl relative overflow-hidden">
                        <CardHeader className="pb-2 z-10">
                            <CardTitle className="text-zinc-200 flex items-center gap-2 text-lg">
                                <UserPlus className="w-5 h-5 text-emerald-500" /> Nuevas Altas
                            </CardTitle>
                            <CardDescription>Crecimiento de este mes (Junio)</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[250px] relative flex items-center justify-center">
                            {/* Texto Central */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                                <span className="text-zinc-500 text-sm font-medium">(Jun Data)</span>
                                <span className="text-5xl font-bold text-white drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                    {currentMonthData.altas}
                                </span>
                                <span className="text-emerald-400 text-sm font-semibold mt-1">Este Mes</span>
                            </div>

                            {/* Gráfico Anillo */}
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={altasData}
                                        cx="50%"
                                        cy="50%"
                                        startAngle={90}
                                        endAngle={-270}
                                        innerRadius={80}
                                        outerRadius={100}
                                        paddingAngle={0}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        <Cell key="val" fill="#10b981" className="drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                                        <Cell key="rest" fill="#27272a" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Gráfico Radial: Bajas (Rojo) */}
                    <Card className="bg-zinc-900/50 border-zinc-800 shadow-xl relative overflow-hidden">
                        <CardHeader className="pb-2 z-10">
                            <CardTitle className="text-zinc-200 flex items-center gap-2 text-lg">
                                <UserMinus className="w-5 h-5 text-rose-500" /> Bajas / Cancelaciones
                            </CardTitle>
                            <CardDescription>Alerta de retención (Junio)</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[250px] relative flex items-center justify-center">
                            {/* Texto Central */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                                <span className="text-zinc-500 text-sm font-medium">(Jun Data)</span>
                                <span className="text-5xl font-bold text-white drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">
                                    {currentMonthData.bajas}
                                </span>
                                <span className="text-rose-400 text-sm font-semibold mt-1">Este Mes</span>
                            </div>

                            {/* Gráfico Anillo */}
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={bajasData}
                                        cx="50%"
                                        cy="50%"
                                        startAngle={90}
                                        endAngle={-270}
                                        innerRadius={80}
                                        outerRadius={100}
                                        paddingAngle={0}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        <Cell key="val" fill="#f43f5e" className="drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]" />
                                        <Cell key="rest" fill="#27272a" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
};

export default Metrics;
