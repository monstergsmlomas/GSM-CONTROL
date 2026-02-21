import { useState, useEffect } from 'react';
import { 
    LayoutDashboard, 
    Users, 
    Activity, 
    PieChart, 
    Settings, 
    LogOut,
    X
} from 'lucide-react';
import type { DashboardUser } from '../types';

interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    users: DashboardUser[]; 
    alertThreshold: number; 
}

const Sidebar = ({ sidebarOpen, setSidebarOpen, activeTab, setActiveTab, users, alertThreshold }: SidebarProps) => {
    const [activeUsersCount, setActiveUsersCount] = useState(0);
    
    const expiringCount = Array.isArray(users) ? users.filter(user => {
        // 1. Solo avisar si está activo o en trial
        if (user.subscriptionStatus !== 'active' && user.subscriptionStatus !== 'trialing') return false;
        
        // 2. Priorizar currentPeriodEnd (suscripción) sobre trialEndsAt
        const rawDate = user.currentPeriodEnd || user.trialEndsAt;
        if (!rawDate) return false;
        
        const limitDate = new Date(rawDate).getTime();
        const now = new Date().getTime();
        
        if (isNaN(limitDate)) return false;

        // 3. Calcular diferencia exacta en horas
        const diffHours = (limitDate - now) / (1000 * 60 * 60);

        // CORRECCIÓN: Contar si faltan menos de 48hs O si ya se venció (números negativos)
        return diffHours <= (alertThreshold || 48);
    }).length : 0;

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'users', label: 'Usuarios', icon: Users },
        { id: 'audit', label: 'Control de Flujo', icon: Activity },
        { id: 'metrics', label: 'Métricas', icon: PieChart },
        { id: 'settings', label: 'Configuración', icon: Settings },
    ];

    useEffect(() => {
        const userEmail = localStorage.getItem('userEmail') || 'admin@gsmfix.com';
        
        const heartbeat = async () => {
            try {
                await fetch('/api/users/ping', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail })
                });
            } catch (error) {
                console.warn('Silent heartbeat failure');
            }
        };

        const fetchActiveCount = async () => {
            try {
                const res = await fetch('/api/users/active-count');
                const data = await res.json();
                if (data && typeof data.count === 'number') {
                    setActiveUsersCount(data.count);
                }
            } catch (error) {
                console.warn('Failed to fetch active count');
            }
        };

        heartbeat();
        fetchActiveCount();
        const pingInterval = setInterval(heartbeat, 60000); 
        const countInterval = setInterval(fetchActiveCount, 30000); 

        return () => {
            clearInterval(pingInterval);
            clearInterval(countInterval);
        };
    }, []);

    const handleTabClick = (id: string) => {
        setActiveTab(id);
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    };

    return (
        <>
            <div 
                className={`md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSidebarOpen(false)}
            />

            <aside className={`fixed md:static inset-y-0 left-0 z-50 bg-zinc-950 border-r border-zinc-900 transition-all duration-300 flex flex-col ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'}`}>
                <div className="h-20 flex items-center justify-between px-6 border-b border-zinc-900">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <img src="/images/gsm-shield-logo.png" alt="Logo" className="h-9 w-auto shrink-0" />
                        <div className={`transition-all duration-300 ${!sidebarOpen && 'md:w-0 md:opacity-0'}`}>
                            <h1 className="text-white font-black text-base tracking-tight leading-none whitespace-nowrap">GSM-CONTROL</h1>
                            <p className="text-indigo-500 text-[8px] font-bold mt-1 tracking-widest uppercase">Console v2.0</p>
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden text-zinc-500 hover:text-white"><X size={20} /></button>
                </div>

                <nav className="flex-1 py-8 px-3 space-y-1.5">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleTabClick(item.id)}
                                className={`w-full flex items-center px-4 py-3 rounded-xl transition-all group relative ${isActive ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 border border-transparent'}`}
                            >
                                <Icon size={20} className={`shrink-0 ${isActive ? 'text-indigo-500' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                                <span className={`ml-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${!sidebarOpen && 'md:w-0 md:opacity-0 overflow-hidden'}`}>{item.label}</span>

                                {item.id === 'users' && expiringCount > 0 && (
                                    <div className={`ml-auto bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md animate-pulse ${!sidebarOpen ? 'absolute top-1 right-1 ml-0 border-2 border-zinc-950' : ''}`}>
                                        {expiringCount}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="px-3 mb-6 mt-auto">
                    {sidebarOpen ? (
                        <div className="bg-zinc-900/50 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative flex h-2.5 w-2.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </div>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Activos Ahora</span>
                            </div>
                            <span className="text-xl font-black text-white font-mono">{activeUsersCount}</span>
                        </div>
                    ) : (
                        <div className="hidden md:flex bg-emerald-500/10 border border-emerald-500/20 rounded-xl h-12 flex-col items-center justify-center relative mx-auto w-12">
                            <span className="text-xs font-black text-emerald-500 font-mono">{activeUsersCount}</span>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;