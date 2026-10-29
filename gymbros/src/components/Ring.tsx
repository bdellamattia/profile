type Props = {
  value: number;
  goal: number;
  color: string;
  label: string;
  unit?: string;
};

export function Ring({ value, goal, color, label, unit = "" }: Props) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? value / goal : 0;
  const dash = Math.min(pct, 1) * c;
  const over = pct > 1;

  return (
    <div className="flex flex-col items-center">
      <div className="relative size-36">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--panel-2)" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            opacity={dash > 0 ? 1 : 0}
            style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.2,.8,.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl tabular-nums">
            {Math.round(value)}
            <span className="text-base">{unit}</span>
          </span>
          <span className="text-xs text-muted tabular-nums">
            / {goal}
            {unit}
          </span>
        </div>
      </div>
      <span className="mt-2 font-display text-sm uppercase" style={{ color }}>
        {label}
        {over && " 🔥"}
      </span>
    </div>
  );
}
