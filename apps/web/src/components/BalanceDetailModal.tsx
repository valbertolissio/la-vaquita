import { useEffect, useState } from "react";
import { X, Undo2 } from "lucide-react";
import { api } from "../lib/api";
import { Expense, Payment } from "../lib/types";
import { displayName, formatDate, formatMoney } from "../lib/format";

interface BalanceDetailModalProps {
  tripId: string;
  userId: string;
  onClose: () => void;
}

interface BreakdownRow {
  key: string;
  date: string;
  description: string;
  subtitle: string;
  amount: number;
  payment?: Payment;
}

export function BalanceDetailModal({ tripId, userId, onClose }: BalanceDetailModalProps) {
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  function reload() {
    api.listExpenses(tripId).then(setExpenses);
    api.listPayments(tripId).then(setPayments);
  }

  useEffect(reload, [tripId]);

  const loading = expenses === null || payments === null;

  const expenseRows: BreakdownRow[] = (expenses ?? [])
    .map((expense) => {
      const mySplit = expense.splits.find((s) => s.userId === userId);
      const paid = expense.paidBy.id === userId ? expense.amount : 0;
      const owed = mySplit ? mySplit.amountOwed : 0;
      return {
        key: `expense-${expense.id}`,
        date: expense.expenseDate,
        description: expense.description,
        subtitle: `${formatDate(expense.expenseDate)} · Pagó: ${expense.paidBy.id === userId ? "vos" : displayName(expense.paidBy)}`,
        amount: paid - owed,
      };
    })
    .filter((row) => Math.abs(row.amount) > 0.005);

  const paymentRows: BreakdownRow[] = (payments ?? [])
    .filter((p) => p.fromUser.id === userId || p.toUser.id === userId)
    .map((p) => {
      const iPaid = p.fromUser.id === userId;
      return {
        key: `payment-${p.id}`,
        date: p.createdAt,
        description: iPaid ? `Le pagaste a ${displayName(p.toUser)}` : `${displayName(p.fromUser)} te pagó`,
        subtitle: formatDate(p.createdAt),
        amount: iPaid ? p.amount : -p.amount,
        payment: p,
      };
    });

  const rows = [...expenseRows, ...paymentRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const total = rows.reduce((s, r) => s + r.amount, 0);

  async function undoPayment(payment: Payment) {
    setUndoingId(payment.id);
    try {
      await api.deletePayment(tripId, payment.id);
      reload();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUndoingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Cómo se compone tu saldo</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-slate-400">Cargando...</p>}
          {!loading && rows.length === 0 && (
            <p className="text-sm text-slate-400">No participaste de ningún gasto ni pago todavía.</p>
          )}
          {rows.length > 0 && (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-700/50">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-100">{row.description}</p>
                    <p className="text-xs text-slate-400">{row.subtitle}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`font-bold ${row.amount >= 0 ? "text-vaquita-greenDark" : "text-red-500"}`}>
                      {row.amount >= 0 ? "+" : ""}
                      {formatMoney(row.amount)}
                    </span>
                    {row.payment && (
                      <button
                        onClick={() => undoPayment(row.payment!)}
                        disabled={undoingId === row.payment.id}
                        title="Deshacer este pago"
                        className="text-slate-300 hover:text-red-500 disabled:opacity-60 dark:text-slate-500"
                      >
                        <Undo2 size={15} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total</span>
          <span className={`text-lg font-bold ${total >= 0 ? "text-vaquita-greenDark" : "text-red-500"}`}>
            {total >= 0 ? "+" : ""}
            {formatMoney(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
