const NOTE =
  "v2 model went live 2026-05-12. Earlier predictions are v1 XGBoost; later predictions are v2 Bayesian + Monte Carlo.";

export function V2Badge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`ml-2 inline-block rounded-sm border border-primary/40 bg-primary/10 px-1.5 py-0 type-eyebrow text-primary ${className}`}
      title={NOTE}
    >
      v2 starts
      <span className="sr-only">: {NOTE}</span>
    </span>
  );
}
