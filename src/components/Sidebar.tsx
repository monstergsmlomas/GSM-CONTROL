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

interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    users: any[]; // NUEVO: Para calcular las alertas
    alertThreshold: number; // NUEVO: Para saber cuándo alertar (ej. 48hs)
}

const Sidebar = ({ sidebarOpen, setSidebarOpen, activeTab, setActiveTab, users, alertThreshold }: SidebarProps) => {
    const [activeUsersCount, setActiveUsersCount] = useState(1);
    
    // LÓGICA DE ALERTAS: Filtramos usuarios activos/trialing que vencen pronto
    const expiringCount = users.filter(user => {
        if (user.subscriptionStatus !== 'active' && user.subscriptionStatus !== 'trialing') return false;
        
        const limitDate = user.trialEndsAt || user.currentPeriodEnd;
        if (!limitDate) return false;
        
        const hoursLeft = (new Date(limitDate).getTime() - new Date().getTime()) / (1000 * 60 * 60);
        return hoursLeft > 0 && hoursLeft <= alertThreshold;
    }).length;

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
            {/* FONDO OSCURO PARA MOBILE */}
            <div 
                className={`
                    md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300
                    ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `}
                onClick={() => setSidebarOpen(false)}
            />

            {/* SIDEBAR PRINCIPAL */}
            <aside 
                className={`
                    fixed md:static inset-y-0 left-0 z-50 bg-zinc-950 border-r border-zinc-800 transition-all duration-300 flex flex-col
                    ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'}
                `}
            >
                {/* LOGO */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-zinc-800 gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <img 
                            src="/images/gsm-shield-logo.png" 
                            alt="GSM-CONTROL Logo" 
                            className="h-11 w-auto shrink-0" 
                        />
                        <div className={`transition-all duration-300 ${!sidebarOpen && 'md:w-0 md:opacity-0'}`}>
                            <h1 className="text-white font-bold text-lg tracking-tight leading-none whitespace-nowrap">GSM-CONTROL</h1>
                            <p className="text-zinc-500 text-[10px] font-mono mt-1 opacity-70">ADMIN CONSOLE</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden text-zinc-500 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* NAVIGATION */}
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleTabClick(item.id)}
                                className={`
                                    w-full flex items-center px-3 py-2.5 rounded-lg transition-all group relative
                                    ${isActive 
                                        ? 'bg-indigo-500/10 text-indigo-400' 
                                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                                    }
                                `}
                            >
                                <Icon size={20} className={`shrink-0 ${isActive ? 'text-indigo-500' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                                <span 
                                    className={`
                                        ml-3 text-sm font-medium transition-all duration-300 whitespace-nowrap
                                        ${!sidebarOpen && 'md:w-0 md:opacity-0 overflow-hidden'}
                                    `}
                                >
                                    {item.label}
                                </span>

                                {/* NOTIFICACIÓN DE USUARIOS POR VENCER */}
                                {item.id === 'users' && expiringCount > 0 && (
                                    <div className={`
                                        ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse
                                        ${!sidebarOpen ? 'absolute top-1 right-1 ml-0 border-2 border-zinc-950' : ''}
                                    `}>
                                        {expiringCount}
                                    </div>
                                )}

                                {isActive && sidebarOpen && (
                                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* INDICADOR DE USUARIOS ACTIVOS */}
                <div className="px-3 mb-4 mt-auto">
                    {sidebarOpen ? (
                        <div className="bg-linear-to-br from-emerald-500/10 to-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.15)] whitespace-nowrap">
                            <div className="flex items-center gap-3">
                                <div className="relative flex h-3.5 w-3.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                                </div>
                                <span className="text-sm font-bold text-emerald-400 tracking-wide">Usuarios Activos</span>
                            </div>
                            <span className="text-2xl font-black text-white font-mono ml-2">{activeUsersCount || 0}</span>
                        </div>
                    ) : (
                        <div className="hidden md:flex bg-emerald-500/10 border border-emerald-500/30 rounded-xl h-12 flex-col items-center justify-center relative mx-auto w-full max-w-12">
                            <div className="absolute top-1.5 right-1.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </div>
                            <span className="text-lg font-black text-white font-mono mt-1">{activeUsersCount || 0}</span>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-3 border-t border-zinc-800">
                    <button className={`
                        w-full flex items-center px-3 py-2.5 rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors group
                    `}>
                        <LogOut size={20} className="shrink-0 group-hover:text-red-500" />
                        <span className={`ml-3 text-sm font-medium transition-all duration-300 whitespace-nowrap ${!sidebarOpen && 'md:w-0 md:opacity-0 overflow-hidden'}`}>
                            Cerrar Sesión
                        </span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;