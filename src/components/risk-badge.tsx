export function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const map = {
    low: "bg-success/15 text-success",
    medium: "bg-warning/20 text-warning-foreground",
    high: "bg-danger/15 text-danger",
  } as const;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[level]}`}>
      {level} risk
    </span>
  );
}
