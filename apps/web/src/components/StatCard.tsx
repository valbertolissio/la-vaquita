import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone?: "positive" | "negative" | "neutral";
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  positive: "text-vaquita-greenDark",
  negative: "text-red-500",
  neutral: "text-slate-800",
};

export function StatCard({ icon: Icon, label, value, sub, tone = "neutral" }: StatCardProps) {
  return (
    <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Icon size={16} strokeWidth={2} />
        {label}
      </div>
      <p className={`mt-2 text-2xl font-bold ${toneClasses[tone]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
