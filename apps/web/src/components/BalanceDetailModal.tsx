import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { Expense } from "../lib/types";
import { displayName, formatDate, formatMoney } from "../lib/format";

interface BalanceDetailModalProps {
  tripId: string;
  userId: string;
  onClose: () => void;
}

interface BreakdownRow {
  expense: Expense;
  amount: number;
}

export function BalanceDetailModal({ tripId, userId, onClose }: BalanceDetailModalProps) {
  const [expenses, setExpenses] = useState<Expense[] | null>(null);

  useEffect(() => {
    api.listExpenses(tripId).then(setExpenses);
  }, [tripId]);

  const rows: BreakdownRow[] = (expenses ?? [])
    .map((expense) => {
      const mySplit = expense.splits.find((s) => s.userId === userId);
      const paid = expense.paidBy.id === userId ? expense.amount : 0;
      const owed = mySplit ? mySplit.amountOwed : 0;
      return { expense, amount: paid - owed };
    })
    .filter((row) => Math.abs(row.amount) > 0.005);

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-800">Cómo se compone tu saldo</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {expenses === null && <p className="text-sm text-slate-400">Cargando...</p>}
          {expenses !== null && rows.length === 0 && (
            <p className="text-sm text-slate-400">No participaste de ningún gasto todavía.</p>
          )}
          {rows.length > 0 && (
            <ul className="space-y-2">
              {rows.map(({ expense, amount }) => (
                <li key={expense.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{expense.description}</p>
                    <p className="text-xs text-slate-400">
                      {formatDate(expense.expenseDate)} · Pagó: {expense.paidBy.id === userId ? "vos" : displayName(expense.paidBy)}
                    </p>
                  </div>
                  <span className={`font-bold ${amount >= 0 ? "text-vaquita-greenDark" : "text-red-500"}`}>
                    {amount >= 0 ? "+" : ""}
                    {formatMoney(amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <span className="text-sm font-medium text-slate-600">Total</span>
          <span className={`text-lg font-bold ${total >= 0 ? "text-vaquita-greenDark" : "text-red-500"}`}>
            {total >= 0 ? "+" : ""}
            {formatMoney(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
