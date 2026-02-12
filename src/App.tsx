import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import Usuarios from './views/Usuarios';
import ControlFlujo from './views/ControlFlujo';
import Metricas from './views/Metricas';
import Configuracion from './views/Configuracion';
import type { DashboardUser, AuditLog, Partner } from './types';
import { MOCK_USERS, MOCK_LOGS } from './types';

export default function App() {
  // --- ESTADOS ---
  const [sidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Datos
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [partners, setPartners] = useState<Partner[]>([
    { id: '1', name: 'Socio A', role: 'Principal', share: 50 },
    { id: '2', name: 'Socio B', role: 'Operativo', share: 50 }
  ]);
  const [isLoading, setIsLoading] = useState(true);

  // Carga Inicial
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
    addLog('Cambio Plan', 'Admin', `Usuario ${userId} a ${newPlan}`);
  };

  const handleToggleStatus = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, estado: u.estado === 'Activo' ? 'Inactivo' : 'Activo' } : u));
    addLog('Cambio Estado', 'Admin', `Usuario ${userId} estado actualizado`);
  };

  const handleCyclePlan = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
        const plans = ['Free', 'Pro', 'Premium'];
        const next = plans[(plans.indexOf(user.plan as any) + 1) % 3];
        handleUpdatePlan({ userId, newPlan: next });
    }
  };

  const handleSaveConfig = (data: any) => {
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
                        onRefresh={() => {}}
                        onUpdatePlan={handleUpdatePlan} 
                        onToggleStatus={handleToggleStatus} 
                        onCyclePlan={handleCyclePlan} 
                    />;
        case 'audit': 
            return <ControlFlujo logs={logs} partners={partners} />;
        case 'metrics': 
            return <Metricas users={users} />;
        case 'settings': 
            return <Configuracion onSave={handleSaveConfig} initialPartners={partners} />;
        
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
