export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  nickname: string | null;
  avatarColor: string | null;
}

export interface TripMember {
  id: string;
  userId: string;
  role: "ORGANIZER" | "MEMBER";
  user: User;
}

export interface Trip {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  currency: string;
  members: TripMember[];
  categories: Category[];
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface ExpenseSplit {
  id: string;
  userId: string;
  amountOwed: number;
  user: User;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  expenseDate: string;
  source: "MANUAL" | "OCR";
  receiptUrl: string | null;
  paidBy: User;
  category: Category | null;
  splits: ExpenseSplit[];
}

export interface TaskCompletion {
  id: string;
  completedAt: string;
  durationSeconds: number | null;
  completedBy: User;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  dueDate: string | null;
  timeTracked: boolean;
  status: "PENDING" | "DONE";
  assignmentType: "MANUAL" | "ROTATING";
  assignedTo: User | null;
  completions?: TaskCompletion[];
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

export interface Settlement {
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

export interface TripSummary {
  totalExpense: number;
  expenseCount: number;
  myBalance: number;
  pendingTotal: number;
  pendingTaskCount: number;
  balances: MemberBalance[];
  settlements: Settlement[];
  recentExpenses: Expense[];
  pendingTasks: Task[];
  expensesByCategory: { name: string; color: string | null; total: number }[];
  timeByParticipant: ParticipantTime[];
}
