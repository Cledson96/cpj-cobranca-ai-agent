import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "blue" | "green" | "amber" | "red";
};

export function StatCard({ icon: Icon, label, value, tone = "blue" }: StatCardProps) {
  return (
    <div className={`stat-card ${tone}`}>
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
