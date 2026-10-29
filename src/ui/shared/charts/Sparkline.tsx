interface SparklineProps {
  readonly values: readonly number[];
  readonly color?: string;
  readonly label: string;
}

const WIDTH = 100;
const HEIGHT = 28;
const PAD = 4;

/** Мини-график тренда: линия в приглушённом цвете, текущая точка — акцентом. */
export function Sparkline({ values, color = 'var(--accent)', label }: SparklineProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = PAD + (index / (values.length - 1)) * (WIDTH - PAD * 2);
    const y = HEIGHT - PAD - ((value - min) / span) * (HEIGHT - PAD * 2);
    return [x, y] as const;
  });
  const last = points.at(-1) ?? [0, 0];
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height={HEIGHT}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <polyline
        points={points.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none"
        stroke="var(--muted)"
        strokeOpacity={0.55}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={3.5}
        fill={color}
        stroke="var(--surface)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
