// src/types.ts



// 1. Definición de Usuario (Con todas las propiedades que usa tu código)

export interface DashboardUser {

  id: string;

  nombre: string;

  email: string;

  plan: 'Free' | 'Pro' | 'Premium';

  estado: 'Activo' | 'Inactivo' | 'Pendiente';

  proyecto: string;

  fechaAlta: string;

}



// 2. Definición de Bitácora (Con 'monto' para que no falle Control de Flujo)

export interface AuditLog {

  id: string;

  accion: string;

  responsable: string;

  detalle: string;

  monto: number;

  fecha: string;

}



// 3. Datos de prueba (Mocks) obligatorios para evitar errores de carga

export const MOCK_USERS: DashboardUser[] = [

  { id: "1", nombre: "Mario Gomez", email: "mario@gsm.com", plan: "Premium", estado: "Activo", proyecto: "GSM FIX", fechaAlta: "2023-10-15" },

  { id: "2", nombre: "Lucia Fernandez", email: "lucia@fix.com", plan: "Pro", estado: "Activo", proyecto: "GSM CONTROL", fechaAlta: "2023-11-02" }

];



export interface Partner {
  id: string;
  name: string;
  role: string;
  share: number;
}

export const MOCK_LOGS: AuditLog[] = [

  { id: "101", accion: "Inicio Sistema", responsable: "System", detalle: "Reinicio de servicios", monto: 0, fecha: new Date().toISOString() }

];
// Al final de src/types.ts agrega:
export interface Partner {
  id: string;
  name: string;
  share: number;
}