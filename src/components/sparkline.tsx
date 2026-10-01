type SparklineProps = {
  progress: number;
  positive?: boolean;
};

export function Sparkline({ progress, positive = true }: SparklineProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const width = 72;
  const height = 28;
  const points = [
    [0, height * 0.7],
    [width * 0.2, height * (positive ? 0.55 : 0.85)],
    [width * 0.45, height * (positive ? 0.35 : 0.65)],
    [width * 0.7, height * (positive ? 0.25 : 0.75)],
    [width, height * (0.15 + (1 - clamped) * 0.5)],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");

  const stroke = positive ? "#39ff14" : "#f87171";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
