// src/types.ts

export interface DashboardUser {
  id: string;
  email: string;
  nombre: string;
  fechaAlta: string;
  subscriptionStatus: 'active' | 'trialing' | 'expired';
  plan: 'Estandar' | 'Multisede' | 'Premium AI' | 'Free';
  trialEndsAt: string | null;
  cicloDePago?: 'mensual' | 'semestral' | 'anual';
  sucursalesExtra?: number;
  currentPeriodEnd?: string | null;
  telefono?: string;
  updatedAt?: string | null;
  lastSeen?: string | Date | null;
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