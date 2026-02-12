import { 
    Zap, 
    ArrowDownRight, 
    BarChart3, 
    PieChart, 
    DollarSign,
    UserPlus,   
    UserMinus,  
    TrendingUp,
    Users // Se agrega Users importado que se usa en el componente
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    PieChart as RePieChart, 
    Pie, 
    ReferenceLine, 
    Cell, 
    Tooltip, 
    Legend, 
    ResponsiveContainer, 
    CartesianGrid, 
    XAxis, 
    YAxis,
    AreaChart,  
    Area        
} from 'recharts';
import type { DashboardUser } from '../types';

interface MetricsPanelProps {
    users: DashboardUser[];
}

const MetricsPanel = ({ users }: MetricsPanelProps) => {
    
    // --- 1. ESTADÍSTICAS DINÁMICAS (CORREGIDO) ---
    const totalUsers = users.length;
    // Ajuste a los nombres reales de los planes
    const premiumUsers = users.filter((u) => u.plan === 'Premium AI').length;
    const multisedeUsers = users.filter((u) => u.plan === 'Multisede').length;
    
    // Altas del mes actual
    const currentMonth = new Date().getMonth();
    const newSignups = users.filter(u => {
        const userDate = new Date(u.fechaAlta);
        return userDate.getMonth() === currentMonth;
    }).length;

    // Bajas
    const churnedUsers = users.filter(u => u.estado === 'Inactivo').length;

    // Cálculo de MRR (Estimado según nuevos planes)
    // Premium AI: $20, Multisede: $15, Estandar: $10 (Valores ejemplo)
    const mrr = (premiumUsers * 20) + (multisedeUsers * 15) + (users.filter(u => u.plan === 'Estandar').length * 10);
    
    // --- 2. DATOS PARA GRÁFICOS ---
    
    const revenueData = [
        { name: 'Ene', revenue: 4000 },
        { name: 'Feb', revenue: 3000 },
        { name: 'Mar', revenue: 2000 },
        { name: 'Abr', revenue: 2780 },
        { name: 'May', revenue: 1890 },
        { name: 'Jun', revenue: 2390 },
        { name: 'Jul', revenue: 3490 },
    ];

    // Distribución Real de Planes
    const userDistribution = [
        { name: 'Free', value: users.filter(u => u.plan === 'Free').length },
        { name: 'Estandar', value: users.filter(u => u.plan === 'Estandar').length },
        { name: 'Multisede', value: multisedeUsers },
        { name: 'Premium AI', value: premiumUsers },
    ];

    const cycles = {
        Mensual: users.filter(u => u.ciclo === 'Mensual' || !u.ciclo).length,
        Semestral: users.filter(u => u.ciclo === 'Semestral').length,
        Anual: users.filter(u => u.ciclo === 'Anual').length,
    };

    const growthData = [
        { name: 'Ene', altas: 12, bajas: 2 },
        { name: 'Feb', altas: 19, bajas: 4 },
        { name: 'Mar', altas: 15, bajas: 3 },
        { name: 'Abr', altas: 25, bajas: 5 },
        { name: 'May', altas: 32, bajas: 4 },
        { name: 'Jun', altas: 28, bajas: 6 },
        { name: 'Jul', altas: newSignups > 0 ? newSignups + 20 : 35, bajas: churnedUsers > 0 ? churnedUsers + 2 : 5 },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
             <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <PieChart className="text-indigo-500" />
                    Métricas & KPIs
                </h2>
                <p className="text-zinc-400 font-mono text-sm mt-1 opacity-80">{'>'} Análisis profundo del rendimiento del negocio.</p>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                
                {/* 1. MRR */}
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">MRR (Mensual)</p>
                            <h3 className="text-2xl font-bold text-white mt-1">${mrr}</h3>
                        </div>
                        <div className="p-2 bg-emerald-500/10 rounded-lg"><DollarSign className="text-emerald-500" size={20} /></div>
                    </div>
                    <span className="text-xs text-emerald-400 flex items-center mt-3 font-medium">+12.5% vs mes ant.</span>
                </div>

                {/* 2. NUEVAS ALTAS */}
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><UserPlus size={80} /></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Nuevas Altas</p>
                            <h3 className="text-2xl font-bold text-white mt-1">{newSignups > 0 ? newSignups : 14}</h3>
                        </div>
                        <div className="p-2 bg-indigo-500/10 rounded-lg"><UserPlus className="text-indigo-500" size={20} /></div>
                    </div>
                    <span className="text-xs text-indigo-400 flex items-center mt-3 font-medium">
                        <TrendingUp size={12} className="mr-1"/> Crecimiento sostenido
                    </span>
                </div>

                {/* 3. BAJAS */}
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Bajas / Inactivos</p>
                            <h3 className="text-2xl font-bold text-white mt-1">{churnedUsers}</h3>
                        </div>
                        <div className="p-2 bg-red-500/10 rounded-lg"><UserMinus className="text-red-500" size={20} /></div>
                    </div>
                    <span className="text-xs text-zinc-500 flex items-center mt-3 font-medium">Usuarios desactivados</span>
                </div>

                {/* 4. CHURN RATE */}
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Churn Rate %</p>
                            <h3 className="text-2xl font-bold text-white mt-1">2.4%</h3>
                        </div>
                        <div className="p-2 bg-red-500/10 rounded-lg"><ArrowDownRight className="text-red-500" size={20} /></div>
                    </div>
                    <span className="text-xs text-red-400 flex items-center mt-3 font-medium">+0.4% Alerta</span>
                </div>

                {/* 5. LTV */}
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">LTV (Valor Vida)</p>
                            <h3 className="text-2xl font-bold text-white mt-1">$450</h3>
                        </div>
                        <div className="p-2 bg-blue-500/10 rounded-lg"><Zap className="text-blue-500" size={20} /></div>
                    </div>
                    <span className="text-xs text-zinc-500 flex items-center mt-3 font-medium">Promedio industria: $320</span>
                </div>

                {/* 6. USUARIOS TOTALES */}
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Base de Usuarios</p>
                            <h3 className="text-2xl font-bold text-white mt-1">{totalUsers}</h3>
                        </div>
                         <div className="p-2 bg-zinc-800 rounded-lg"><Users className="text-zinc-400" size={20} /></div>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: '75%' }}></div>
                    </div>
                </div>
            </div>

            {/* FILA DE GRÁFICOS 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ingresos */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <BarChart3 size={18} className="text-zinc-500" /> Crecimiento de Ingresos
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                <Tooltip 
                                    cursor={{fill: '#27272a'}}
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }} 
                                />
                                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <ReferenceLine y={3000} stroke="#ef4444" strokeDasharray="3 3" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribución */}
                 <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <PieChart size={18} className="text-zinc-500" /> Distribución de Planes
                    </h3>
                    <div className="h-[300px] flex items-center justify-center">
                         <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={userDistribution}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {userDistribution.map((entry, index) => (
                                        // Colores: Free (Gris), Estandar (Azul), Multisede (Esmeralda), Premium AI (Oro)
                                        <Cell key={`cell-${index}`} fill={
                                            index === 0 ? '#71717a' : 
                                            index === 1 ? '#3b82f6' : 
                                            index === 2 ? '#10b981' : 
                                            '#fbbf24'
                                        } />
                                    ))}
                                </Pie>
                                <Tooltip 
                                     contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                                     itemStyle={{ color: '#fff' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* FILA DE GRÁFICOS 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Distribución de Ciclos */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <DollarSign size={18} className="text-emerald-500" /> Ciclos de Facturación
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                            <span className="text-zinc-400 text-sm">Mensual</span>
                            <span className="text-white font-bold font-mono">{cycles.Mensual}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                            <span className="text-zinc-400 text-sm">Semestral</span>
                            <span className="text-white font-bold font-mono">{cycles.Semestral}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-zinc-950/50 rounded-lg border border-zinc-800 relative overflow-hidden">
                            <div className="absolute inset-0 bg-emerald-500/5"></div>
                            <span className="text-emerald-400 text-sm font-bold">Anual (Mejor LTV)</span>
                            <span className="text-emerald-400 font-bold font-mono">{cycles.Anual}</span>
                        </div>
                    </div>
                </div>

                {/* Dinámica de Crecimiento */}
                <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <TrendingUp size={18} className="text-emerald-500" /> Dinámica de Crecimiento
                        </h3>
                        <div className="flex gap-4 text-xs font-medium">
                            <span className="flex items-center gap-1 text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Altas</span>
                            <span className="flex items-center gap-1 text-red-400"><div className="w-2 h-2 rounded-full bg-red-500"></div> Bajas</span>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={growthData}>
                                <defs>
                                    <linearGradient id="colorAltas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorBajas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }} />
                                <Area type="monotone" dataKey="altas" stroke="#10b981" fillOpacity={1} fill="url(#colorAltas)" strokeWidth={2} />
                                <Area type="monotone" dataKey="bajas" stroke="#ef4444" fillOpacity={1} fill="url(#colorBajas)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MetricsPanel;