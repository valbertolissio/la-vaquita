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

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  members: TripMember[];
  categories: Category[];
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
  paidBy: User;
  category: Category | null;
  splits: ExpenseSplit[];
}

export interface Payment {
  id: string;
  amount: number;
  note: string | null;
  createdAt: string;
  fromUser: User;
  toUser: User;
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
  timeByParticipant: ParticipantTime[];
}
