export default function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-surface border border-white/[0.06] rounded-xl p-5">
      <p className="text-xs text-muted uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-bold ${accent || 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}
