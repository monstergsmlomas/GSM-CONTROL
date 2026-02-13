import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import Usuarios from './views/Usuarios';
import ControlFlujo from './views/ControlFlujo';
import Metricas from './views/Metricas';
import Configuracion from './views/Configuracion';
import type { DashboardUser, AuditLog, Partner } from './types';

export default function App() {
  // --- ESTADOS ---
  const [sidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Datos Maestros
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  
  // SOCIOS: Inicializados como Socio 1 y 2 al 50% para garantizar equidad desde el arranque
  const [partners, setPartners] = useState<Partner[]>([
    { id: '1', name: 'Socio 1', role: 'Socio Principal', share: 50 },
    { id: '2', name: 'Socio 2', role: 'Socio Principal', share: 50 }
  ]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorLine, setErrorLine] = useState<string | null>(null);

  // Carga Real desde Backend
  const fetchData = async () => {
    setIsLoading(true);
    setErrorLine(null);
    console.log("Iniciando FETCH de usuarios y métricas...");
    try {
        // Fetch Users
        const usersRes = await fetch('/api/users', { cache: 'no-store' });
        console.log("Respuesta /api/users status:", usersRes.status);
        if (usersRes.ok) {
            const userData = await usersRes.json();
            if (Array.isArray(userData)) {
                console.log("✅ Usuarios cargados:", userData.length);
                setUsers(userData);
            } else {
                setErrorLine(`Formato de datos erróneo: se esperaba lista pero se recibió ${typeof userData}`);
            }
        } else {
            const errorText = await usersRes.text();
            setErrorLine(`Error API (Usuarios): ${usersRes.status} - ${errorText.substring(0, 50)}`);
        }

        
    } catch (error: any) {
        console.error("FATAL: Error de conexión con el Backend:", error);
        setErrorLine(`Error de Conexión: ${error.message}. ¿Está prendido el servidor?`);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh cada 30 segundos
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- LÓGICA DE NEGOCIO ---

  const addLog = (accion: string, responsable: string, detalle: string, monto: number = 0) => {
    const newLog: AuditLog = {
      id: Date.now().toString(),
      accion,
      responsable,
      detalle,
      monto,
      fecha: new Date().toISOString()
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleUpdateStatus = async ({ userId, newStatus, trialEndsAt }: { userId: string, newStatus: 'active' | 'trialing' | 'expired', trialEndsAt?: string }) => {
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subscriptionStatus: newStatus,
                trialEndsAt: trialEndsAt
            })
        });

        if (response.ok) {
            const updatedUser = await response.json();
            console.log("✅ Usuario actualizado en DB:", updatedUser);
            fetchData(); // Refrescar lista completa para estar sincronizados globalmente
            addLog('Update DB', 'Admin', `ID ${userId}: Status ${newStatus}, Trial ${trialEndsAt || 'N/A'}`);
        } else {
            const err = await response.text();
            setErrorLine(`Error guardando cambios: ${err}`);
        }
    } catch (error: any) {
        console.error("Error en handleUpdateStatus:", error);
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
      // Sincronización: Si la configuración cambia los socios, actualizamos el estado global
      if (data.partners) {
          setPartners(data.partners);
          addLog('Configuración', 'Admin', 'Se actualizó la estructura societaria');
      }
  };

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
         {/* BANNER DE ERROR */}
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
