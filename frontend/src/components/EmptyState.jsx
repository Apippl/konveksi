export default function EmptyState({ children, className = "" }) {
  return (
    <div className={`p-8 text-center text-sm text-slate-400 ${className}`}>{children}</div>
  );
}
