export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
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

export interface Expense {
  id: string;
  description: string;
  amount: number;
  expenseDate: string;
  paidBy: User;
  category: Category | null;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  status: "PENDING" | "DONE";
  assignmentType: "MANUAL" | "ROTATING";
  assignedTo: User | null;
}

export interface MemberBalance {
  userId: string;
  name: string;
  paid: number;
  owed: number;
  balance: number;
}

export interface Settlement {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

export interface TripSummary {
  totalExpense: number;
  expenseCount: number;
  myBalance: number;
  pendingTaskCount: number;
  balances: MemberBalance[];
  settlements: Settlement[];
  recentExpenses: Expense[];
  pendingTasks: Task[];
}
