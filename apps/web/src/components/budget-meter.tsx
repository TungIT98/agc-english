interface BudgetMeterProps {
  agentId: string;
  agentName: string;
  spentCents: number;
  budgetCents: number;
}

export default function BudgetMeter({ agentName, spentCents, budgetCents }: BudgetMeterProps) {
  const percentage = Math.min(100, Math.round((spentCents / budgetCents) * 100));
  const isWarning = percentage >= 80;
  const isExceeded = percentage >= 100;

  const barColor = isExceeded
    ? "var(--error)"
    : isWarning
    ? "var(--warning)"
    : "var(--success)";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span style={{ color: "var(--text-secondary)" }}>{agentName}</span>
        <span style={{ color: barColor }}>{percentage}%</span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--border)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, percentage)}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
        ${(spentCents / 100).toFixed(2)} / ${(budgetCents / 100).toFixed(2)}
      </div>
    </div>
  );
}
