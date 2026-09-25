export interface Usuario {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  nickname: string | null;
  avatarColor: string | null;
}

export interface Participante {
  id: string;
  userId: string;
  role: "ORGANIZER" | "MEMBER";
  user: Usuario;
}

export interface Proyecto {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  currency: string;
  members: Participante[];
  categories: Categoria[];
}

export interface Categoria {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface DivisionDelGasto {
  id: string;
  userId: string;
  amountOwed: number;
  user: Usuario;
}

export interface PagadorDelGasto {
  id: string;
  userId: string;
  amount: number;
  user: Usuario;
}

export interface Gasto {
  id: string;
  description: string;
  amount: number;
  expenseDate: string;
  source: "MANUAL" | "OCR";
  receiptUrl: string | null;
  payers: PagadorDelGasto[];
  category: Categoria | null;
  splits: DivisionDelGasto[];
}

export interface Pago {
  id: string;
  amount: number;
  note: string | null;
  createdAt: string;
  fromUser: Usuario;
  toUser: Usuario;
}

export interface TareaCompletada {
  id: string;
  completedAt: string;
  durationSeconds: number | null;
  completedBy: Usuario;
}

export interface Tarea {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  dueDate: string | null;
  timeTracked: boolean;
  status: "PENDING" | "DONE";
  assignmentType: "MANUAL" | "ROTATING";
  assignedTo: Usuario | null;
  completions?: TareaCompletada[];
}

export interface MemberBalance {
  userId: string;
  name: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  paid: number;
  owed: number;
  balance: number;
}

export interface PagoSugerido {
  fromUserId: string;
  fromName: string;
  fromAvatarColor: string | null;
  toUserId: string;
  toName: string;
  toAvatarColor: string | null;
  amount: number;
}

export interface ParticipantTime {
  userId: string;
  name: string;
  avatarColor: string | null;
  totalSeconds: number;
  taskCount: number;
}

export interface ResumenDelProyecto {
  totalExpense: number;
  expenseCount: number;
  myBalance: number;
  myContribution: number;
  othersContribution: number;
  paidToMe: number;
  pendingTotal: number;
  pendingTaskCount: number;
  balances: MemberBalance[];
  settlements: PagoSugerido[];
  recentExpenses: Gasto[];
  pendingTasks: Tarea[];
  expensesByCategory: { name: string; color: string | null; total: number }[];
  timeByParticipant: ParticipantTime[];
}
