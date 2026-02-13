
import { 
    LayoutDashboard, 
    Users, 
    Activity, 
    PieChart, 
    Settings, 
    LogOut 
} from 'lucide-react';

interface SidebarProps {
    sidebarOpen: boolean;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const Sidebar = ({ sidebarOpen, activeTab, setActiveTab }: SidebarProps) => {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'users', label: 'Usuarios', icon: Users },
        { id: 'audit', label: 'Control de Flujo', icon: Activity },
        { id: 'metrics', label: 'Métricas', icon: PieChart },
        { id: 'settings', label: 'Configuración', icon: Settings },
    ];

    return (
        <aside 
            className={`
                bg-zinc-950 border-r border-zinc-800 transition-all duration-300 flex flex-col
                ${sidebarOpen ? 'w-64' : 'w-20'}
            `}
        >
            {/* LOGO */}
            <div className="h-20 flex items-center px-6 border-b border-zinc-800 gap-3">
                <img 
                    src="/images/gsm-shield-logo.png" 
                    alt="GSM-CONTROL Logo" 
                    className="h-11 w-auto shrink-0" 
                />
                <div className={`overflow-hidden transition-all duration-300 ${!sidebarOpen && 'w-0 opacity-0'}`}>
                    <h1 className="text-white font-bold text-lg tracking-tight leading-none">GSM-CONTROL</h1>
                    <p className="text-zinc-500 text-[10px] font-mono mt-1 opacity-70">ADMIN CONSOLE</p>
                </div>
            </div>

            {/* NAVIGATION */}
            <nav className="flex-1 py-6 px-3 space-y-1">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
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
                                    ${!sidebarOpen && 'w-0 opacity-0 overflow-hidden'}
                                `}
                            >
                                {item.label}
                            </span>
                            {isActive && sidebarOpen && (
                                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* FOOTER */}
            <div className="p-3 border-t border-zinc-800">
                <button className={`
                    w-full flex items-center px-3 py-2.5 rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors group
                `}>
                    <LogOut size={20} className="shrink-0 group-hover:text-red-500" />
                    <span className={`ml-3 text-sm font-medium transition-all duration-300 ${!sidebarOpen && 'w-0 opacity-0 overflow-hidden'}`}>
                        Cerrar Sesión
                    </span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
