function riskColor(score) {
  if (score >= 80) return 'bg-accent';
  if (score >= 60) return 'bg-amber-500';
  if (score >= 30) return 'bg-primary';
  return 'bg-secondary';
}

export default function RiskBar({ score = 0 }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${riskColor(pct)} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted w-8 text-right">{Math.round(pct)}</span>
    </div>
  );
}
