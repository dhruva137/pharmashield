const MAP = {
  CRITICAL: 'bg-accent/15 text-accent border-accent/30',
  HIGH:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
  MEDIUM:   'bg-primary/15 text-primary border-primary/30',
  LOW:      'bg-secondary/15 text-secondary border-secondary/30',
  critical: 'bg-accent/15 text-accent border-accent/30',
  high:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
  medium:   'bg-primary/15 text-primary border-primary/30',
  low:      'bg-secondary/15 text-secondary border-secondary/30',
};

export default function SeverityBadge({ severity }) {
  const cls = MAP[severity] || 'bg-white/10 text-muted border-white/10';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {String(severity).toUpperCase()}
    </span>
  );
}
