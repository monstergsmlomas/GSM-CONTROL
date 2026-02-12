import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import Usuarios from './views/Usuarios';
import ControlFlujo from './views/ControlFlujo';
import Metricas from './views/Metricas';
import Configuracion from './views/Configuracion';
import type { DashboardUser, AuditLog, Partner, PlanGSM } from './types';
import { MOCK_USERS, MOCK_LOGS } from './types';

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

  // Carga Inicial (Simulación de Fetch)
  useEffect(() => {
    const timer = setTimeout(() => {
       setUsers(MOCK_USERS);
       setLogs(MOCK_LOGS);
       setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
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

  const handleUpdatePlan = ({ userId, newPlan }: { userId: string, newPlan: string }) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan as any } : u));
    addLog('Cambio Plan', 'Admin', `Usuario ${userId} a ${newPlan}`, 0);
  };

  const handleToggleStatus = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, estado: u.estado === 'Activo' ? 'Inactivo' : 'Activo' } : u));
    addLog('Cambio Estado', 'Admin', `Usuario ${userId} estado actualizado`);
  };

  const handleCyclePlan = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
        // Orden Lógico de Ascenso: Free -> Estandar -> Multisede -> Premium AI
        const plans: PlanGSM[] = ['Free', 'Estandar', 'Multisede', 'Premium AI'];
        // Encuentra el índice actual y suma 1 (usando módulo % para volver al principio si llega al final)
        const next = plans[(plans.indexOf(user.plan) + 1) % plans.length];
        
        handleUpdatePlan({ userId, newPlan: next });
    }
  };

  const handleSaveConfig = (data: any) => {
      // Sincronización: Si la configuración cambia los socios, actualizamos el estado global
      if (data.partners) {
          setPartners(data.partners);
          addLog('Configuración', 'Admin', 'Se actualizó la estructura societaria');
      }
      // Aquí iría la lógica para guardar supabaseUrl y Key si fuera necesario en App
  };

  // --- RENDERIZADO DE VISTAS ---
  const renderContent = () => {
      switch (currentView) {
        case 'users': 
            return <Usuarios 
                        users={users} 
                        isLoading={isLoading} 
                        onRefresh={() => {}}
                        onUpdatePlan={handleUpdatePlan} 
                        onToggleStatus={handleToggleStatus} 
                        onCyclePlan={handleCyclePlan} 
                    />;
        case 'audit': 
            // Pasamos 'partners' para que el cálculo de dividendos funcione
            return <ControlFlujo logs={logs} partners={partners} />;
        case 'metrics': 
            return <Metricas users={users} />;
        case 'settings': 
            // Eliminamos 'initialPartners' que causaba error. 
            // El componente Configuracion gestiona su propio estado inicial o carga de localStorage.
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
         <div className="flex-1 overflow-auto p-6 bg-[#09090b]">
             {renderContent()}
         </div>
      </main>
    </div>
  );
}
