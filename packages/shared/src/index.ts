// Tipos de referencia compartidos entre api / web / mobile.
// api/web/mobile mantienen sus propias copias locales (src/lib/types.ts) para no acoplar
// el build de cada app a este paquete; este archivo documenta el contrato común.

export type TripRole = "ORGANIZER" | "MEMBER";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
export type ExpenseSource = "MANUAL" | "OCR";
export type TaskStatus = "PENDING" | "DONE";
export type AssignmentType = "MANUAL" | "ROTATING";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface Trip {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  currency: string;
}

export interface MemberBalance {
  userId: string;
  name: string;
  paid: number;
  owed: number;
  balance: number;
}
