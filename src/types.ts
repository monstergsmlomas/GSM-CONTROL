// src/types.ts

// 1. Definiciones de Tipos (SaaS Logic)
export type PlanGSM = 'Free' | 'Estandar' | 'Multisede' | 'Premium AI';
export type CicloPago = 'Mensual' | 'Semestral' | 'Anual';

// 2. Interfaces Principales
export interface DashboardUser {
  id: string;
  nombre: string;
  email: string;
  plan: PlanGSM;
  ciclo: CicloPago;
  vencimiento: string;
  monto_pago: number;
  estado: 'Activo' | 'Inactivo' | 'Pendiente';
  proyecto: string;
  fechaAlta: string;
}

export interface AuditLog {
  id: string;
  accion: string;
  responsable: string;
  detalle: string;
  monto: number;
  fecha: string;
}

export interface Partner {
  id: string;
  name: string;
  role: string;
  share: number;
}

// 3. Mock Data (Datos de prueba enriquecidos para visualizar mejor el Dashboard)
export const MOCK_USERS: DashboardUser[] = [
  { 
      id: "1", nombre: "Mario Gomez", email: "mario@gsm.com", 
      plan: "Premium AI", ciclo: "Anual", vencimiento: "2024-12-31", monto_pago: 1200,
      estado: "Activo", proyecto: "GSM FIX", fechaAlta: "2023-10-15" 
  },
  { 
      id: "2", nombre: "Lucia Fernandez", email: "lucia@fix.com", 
      plan: "Estandar", ciclo: "Mensual", vencimiento: "2024-03-01", monto_pago: 50,
      estado: "Activo", proyecto: "GSM CONTROL", fechaAlta: "2023-11-02" 
  },
  { 
      id: "3", nombre: "Carlos Ruiz", email: "carlos@tech.com", 
      plan: "Multisede", ciclo: "Semestral", vencimiento: "2024-06-15", monto_pago: 600,
      estado: "Activo", proyecto: "TECH CENTER", fechaAlta: "2024-01-10" 
  },
  { 
      id: "4", nombre: "Ana Vivaldi", email: "ana@test.com", 
      plan: "Free", ciclo: "Mensual", vencimiento: "2024-02-28", monto_pago: 0,
      estado: "Pendiente", proyecto: "DEMO STORE", fechaAlta: new Date().toISOString() // Usuario nuevo hoy
  }
];

export const MOCK_LOGS: AuditLog[] = [
  { 
      id: "101", accion: "Inicio Sistema", responsable: "System", detalle: "Reinicio de servicios", monto: 0, fecha: new Date().toISOString() 
  },
  { 
      id: "102", accion: "Pago Recibido", responsable: "Sistema", detalle: "Cobro suscripción Mario Gomez (Anual)", monto: 1200, fecha: new Date(Date.now() - 1000 * 60 * 60).toISOString() // Hace 1 hora
  },
  {
      id: "103", accion: "Nuevo Usuario", responsable: "Web", detalle: "Registro Free: Ana Vivaldi", monto: 0, fecha: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() // Hace 5 hours
  }
];