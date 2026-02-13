import { useState, useEffect } from 'react';
import { Lock, ShieldCheck } from 'lucide-react'; 
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import Usuarios from './views/Usuarios';
import ControlFlujo from './views/ControlFlujo';
import Metricas from './views/Metricas';
import Configuracion from './views/Configuracion';
import type { DashboardUser, AuditLog, Partner } from './types';

export default function App() {
  // --- ESTADOS DE SESIÓN (LOGIN) ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ user: '', pin: '' });
  const [loginError, setLoginError] = useState('');

  // --- ESTADOS ORIGINALES ---
  const [sidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  
  const [partners, setPartners] = useState<Partner[]>([
    { id: '1', name: 'Rodrigo', role: 'Socio Principal', share: 50 },
    { id: '2', name: 'Tomy', role: 'Socio Fundador', share: 50 }
  ]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorLine, setErrorLine] = useState<string | null>(null);

  // --- LÓGICA DE LOGIN ---
  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (loginForm.user && loginForm.pin === '1234') {
          setCurrentUser(loginForm.user);
          setIsLoggedIn(true);
          setLoginError('');
      } else {
          setLoginError('PIN incorrecto. Intenta nuevamente.');
      }
  };

  // --- LÓGICA DE DATOS DESDE SUPABASE ---
  const fetchData = async () => {
    if (!isLoggedIn) return; // Protegido tras login
    
    setIsLoading(true);
    setErrorLine(null);
    try {
        // Pedimos a la base de datos los Usuarios y el Historial de Logs al mismo tiempo
        const [usersRes, logsRes] = await Promise.all([
            fetch('/api/users', { cache: 'no-store' }),
            fetch('/api/logs', { cache: 'no-store' }).catch(() => null) // .catch por seguridad
        ]);

        // Cargar usuarios
        if (usersRes.ok) {
            const userData = await usersRes.json();
            setUsers(Array.isArray(userData) ? userData : []);
        } else {
            setErrorLine(`Error API (Usuarios): ${usersRes.status}`);
        }

        // Cargar Historial Real
        if (logsRes && logsRes.ok) {
            const logsData = await logsRes.json();
            setLogs(Array.isArray(logsData) ? logsData : []);
        }
    } catch (error: any) {
        setErrorLine(`Error de Conexión. ¿Está prendido el servidor?`);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresco automático cada 30s
        return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // --- LÓGICA DE NEGOCIO Y FIRMA DE AUDITORÍA ---

  // Esto es para acciones sin usuario (ej: cambiar config de socios)
  const addLog = async (accion: string, detalle: string, monto: number = 0) => {
    const responsable = currentUser || 'Sistema'; 
    try {
        await fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accion, responsable, detalle, monto })
        });
        fetchData(); // Sincronizamos la tabla tras la inserción
    } catch (error) {
        console.error("No se pudo guardar el log suelto", error);
    }
  };

  const handleUpdateStatus = async ({ userId, newStatus, trialEndsAt }: { userId: string, newStatus: 'active' | 'trialing' | 'expired', trialEndsAt?: string }) => {
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subscriptionStatus: newStatus,
                trialEndsAt: trialEndsAt,
                responsable: currentUser // <--- ¡AQUÍ ESTÁ LA MAGIA! Tu firma viaja al servidor
            })
        });

        if (response.ok) {
            fetchData(); // Recargamos la vista para ver los nuevos estados y el nuevo log
        } else {
            const err = await response.text();
            setErrorLine(`Error guardando cambios: ${err}`);
        }
    } catch (error: any) {
        setErrorLine("No se pudo conectar con el servidor para guardar.");
    }
  };

  const handleToggleStatus = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
        const nextStatus = user.subscriptionStatus === 'active' ? 'expired' : 'active';
        handleUpdateStatus({ userId, newStatus: nextStatus as any });
    }
  };

  const handleCycleStatus = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
        const statuses: ('active' | 'trialing' | 'expired')[] = ['trialing', 'active', 'expired'];
        const currentIdx = statuses.indexOf(user.subscriptionStatus);
        const next = statuses[(currentIdx + 1) % statuses.length];
        handleUpdateStatus({ userId, newStatus: next });
    }
  };

  const handleSaveConfig = (data: any) => {
      if (data.partners) {
          setPartners(data.partners);
          addLog('Configuración', 'Se actualizó la estructura societaria', 0);
      }
  };

  // --- PANTALLA DE LOGIN ---
  if (!isLoggedIn) {
      return (
          <div className="flex h-screen bg-[#09090b] items-center justify-center font-sans">
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                  <div className="flex justify-center mb-6">
                      <div className="w-16 h-16 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-center shadow-inner">
                          <ShieldCheck size={32} className="text-indigo-500" />
                      </div>
                  </div>
                  <h2 className="text-2xl font-bold text-white text-center mb-1">GSM CONTROL</h2>
                  <p className="text-zinc-500 text-xs text-center font-mono uppercase tracking-widest mb-8">Acceso de Seguridad</p>
                  
                  <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                          <label className="text-zinc-400 text-xs font-bold mb-1 block">OPERADOR</label>
                          <select 
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer transition-colors"
                              value={loginForm.user}
                              onChange={(e) => setLoginForm({...loginForm, user: e.target.value})}
                              required
                          >
                              <option value="" disabled>Seleccionar usuario...</option>
                              <option value="Rodrigo">👤 Rodrigo</option>
                              <option value="Tomy">👤 Tomy</option>
                          </select>
                      </div>
                      
                      <div>
                          <label className="text-zinc-400 text-xs font-bold mb-1 block">PIN DE ACCESO</label>
                          <div className="relative">
                              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                              <input 
                                  type="password" 
                                  placeholder="••••"
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 pl-10 text-white focus:outline-none focus:border-indigo-500 text-center tracking-[0.5em] transition-colors"
                                  value={loginForm.pin}
                                  onChange={(e) => setLoginForm({...loginForm, pin: e.target.value})}
                                  required
                              />
                          </div>
                      </div>

                      {loginError && <p className="text-rose-500 text-xs text-center font-bold bg-rose-500/10 py-2 rounded-lg">{loginError}</p>}

                      <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 mt-2">
                          INGRESAR AL SISTEMA
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  // --- RENDERIZADO DE VISTAS ---
  const renderContent = () => {
      switch (currentView) {
        case 'users': 
            return <Usuarios 
                        users={users} 
                        isLoading={isLoading} 
                        onRefresh={fetchData}
                        onUpdateStatus={handleUpdateStatus} 
                        onToggleStatus={handleToggleStatus} 
                        onCycleStatus={handleCycleStatus} 
                    />;
        case 'audit': 
            return <ControlFlujo logs={logs} partners={partners} />;
        case 'metrics': 
            return <Metricas users={users} />;
        case 'settings': 
            return <Configuracion onSave={handleSaveConfig} />;
        default: 
            return <Dashboard 
                        users={users} 
                        logs={logs} 
                        isLoading={isLoading} 
                        setCurrentView={setCurrentView}
                    />;
      }
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} activeTab={currentView} setActiveTab={setCurrentView} />
      <main className="flex-1 flex flex-col overflow-hidden relative">
         {errorLine && (
             <div className="bg-red-600 text-white px-6 py-2 flex justify-between items-center animate-in slide-in-from-top duration-300">
                 <div className="flex items-center gap-2 text-sm font-bold">
                     <span>⚠️ ERROR DE SINCRONIZACIÓN:</span>
                     <span className="font-normal opacity-90">{errorLine}</span>
                 </div>
                 <button onClick={() => fetchData()} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors uppercase font-bold">
                     Reintentar ahora
                 </button>
             </div>
         )}
         
         <div className="flex-1 overflow-auto p-6 bg-[#09090b]">
             {renderContent()}
         </div>
      </main>
    </div>
  );
}