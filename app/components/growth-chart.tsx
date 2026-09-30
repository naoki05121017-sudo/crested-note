export function GrowthChart({
  mine,
  average,
  guide = [],
}: {
  mine: { month: number; weightG: number }[];
  average: { month: number; weightG: number }[];
  guide?: {
    month: number;
    weightG: number;
    source: "reference" | "measured";
  }[];
}) {
  const points = [...mine, ...average, ...guide];
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
  const hasMeasuredGuide = guide.some((point) => point.source === "measured");

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
    <div className="w-full max-w-full overflow-hidden">
      {guide.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>黒：あなたのクレス</span>
          <span className="text-[#8a7a4a]">橙：参考目安</span>
          {hasMeasuredGuide ? (
            <span className="text-[#3d8f7a]">緑：クレスノート実測平均</span>
          ) : null}
        </div>
      ) : null}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full max-w-full"
      >
        <rect width={width} height={height} rx="20" fill="#f6f3f6" />
        {[0.25, 0.5, 0.75].map((frac) => (
          <line
            key={frac}
            x1={pad}
            x2={width - pad}
            y1={pad + (height - pad * 2) * frac}
            y2={pad + (height - pad * 2) * frac}
            stroke="#e8dde8"
          />
        ))}
        <text x={pad} y={22} fontSize="11" fill="#6d675f">
          g
        </text>
        <text x={width - 78} y={height - 12} fontSize="11" fill="#6d675f">
          月齢
        </text>
        {average.length > 1 ? (
          <path d={path(average)} fill="none" stroke="#9de0c4" strokeWidth="5" />
        ) : null}
        {guide.length > 1 ? (
          <path
            d={path(guide)}
            fill="none"
            stroke="#c4b07a"
            strokeWidth="4"
            strokeDasharray="7 6"
          />
        ) : null}
        {mine.length > 1 ? (
          <path d={path(mine)} fill="none" stroke="#17141c" strokeWidth="2.6" />
        ) : null}
        {mine.map((point) => (
          <circle
            key={`m-${point.month}-${point.weightG}`}
            cx={x(point.month)}
            cy={y(point.weightG)}
            r="4.5"
            fill="#17141c"
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
        {guide.map((point) => (
          <circle
            key={`g-${point.source}-${point.month}-${point.weightG}`}
            cx={x(point.month)}
            cy={y(point.weightG)}
            r="3.5"
            fill={point.source === "measured" ? "#3d8f7a" : "#c4b07a"}
          />
        ))}
      </svg>
    </div>
  );
}
