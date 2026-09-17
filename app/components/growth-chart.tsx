export function GrowthChart({
  mine,
  average,
}: {
  mine: { month: number; weightG: number }[];
  average: { month: number; weightG: number }[];
}) {
  const points = [...mine, ...average];
  if (points.length === 0) {
    return (
      <p className="rounded-2xl bg-sand px-4 py-6 text-center text-sm text-muted">
        体重記録がまだありません。
      </p>
    );
  }
  const maxX = Math.max(...points.map((point) => point.month), 1);
  const maxY = Math.max(...points.map((point) => point.weightG), 1) * 1.08;
  const width = 640;
  const height = 280;
  const pad = 40;

  function x(month: number) {
    return pad + (month / maxX) * (width - pad * 2);
  }
  function y(weight: number) {
    return height - pad - (weight / maxY) * (height - pad * 2);
  }
  function path(series: { month: number; weightG: number }[]) {
    return series
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${x(point.month)} ${y(point.weightG)}`,
      )
      .join(" ");
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
      <rect width={width} height={height} rx="24" fill="#fffdf9" />
      {[0.25, 0.5, 0.75].map((frac) => (
        <line
          key={frac}
          x1={pad}
          x2={width - pad}
          y1={pad + (height - pad * 2) * frac}
          y2={pad + (height - pad * 2) * frac}
          stroke="#ece6dc"
        />
      ))}
      <text x={pad} y={22} fontSize="11" fill="#6d675f">
        g
      </text>
      <text x={width - 78} y={height - 12} fontSize="11" fill="#6d675f">
        月齢
      </text>
      {average.length > 1 ? (
        <path d={path(average)} fill="none" stroke="#d9efe6" strokeWidth="5" />
      ) : null}
      {mine.length > 1 ? (
        <path d={path(mine)} fill="none" stroke="#1c1917" strokeWidth="3" />
      ) : null}
      {mine.map((point) => (
        <circle
          key={`m-${point.month}-${point.weightG}`}
          cx={x(point.month)}
          cy={y(point.weightG)}
          r="4.5"
          fill="#1c1917"
        />
      ))}
      {average.map((point) => (
        <circle
          key={`a-${point.month}-${point.weightG}`}
          cx={x(point.month)}
          cy={y(point.weightG)}
          r="3.5"
          fill="#6f9d88"
        />
      ))}
    </svg>
  );
}
