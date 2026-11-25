type Props = {
  // 1, 2 or 3
  current: number;
  // "Informations et jours"
  label: string;
};

// Screens PRO-02 and PRO-03: how far the creation has gone.
function StepBar({ current, label }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <div aria-hidden="true" className="grid grid-cols-3 gap-1">
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={`h-1 rounded-sm ${
              step <= current ? "bg-secondary" : "bg-track"
            }`}
          />
        ))}
      </div>
      <p className="text-xs font-semibold leading-[1.45] text-muted">
        Étape {current} / 3 · {label}
      </p>
    </div>
  );
}

export default StepBar;
