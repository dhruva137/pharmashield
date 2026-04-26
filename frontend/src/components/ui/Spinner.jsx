export default function Spinner({ size = 'md' }) {
  const sz = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  return (
    <div className={`${sz} rounded-full border-2 border-white/10 border-t-primary animate-spin`} />
  );
}
