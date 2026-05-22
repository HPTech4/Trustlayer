export function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const map = {
    low: { bg: '#F0FDF4', text: '#22C55E', border: '#BBF7D0' },
    medium: { bg: '#FEFCE8', text: '#FACC15', border: '#FEF3C7' },
    high: { bg: '#FEF2F2', text: '#EF4444', border: '#FECACA' },
  } as const;
  
  const style = map[level];
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-medium capitalize" style={{
      backgroundColor: style.bg,
      color: style.text,
      border: `1px solid ${style.border}`,
      borderRadius: '20px'
    }}>
      {level} risk
    </span>
  );
}
