import {
  describeProgressSeries,
  formatDayMonth,
  formatMetricValue,
  type ProgressMetric,
  type ProgressPoint,
} from "shared";

type Props = {
  points: ProgressPoint[];
  metric: ProgressMetric;
};

const WIDTH = 320;
const HEIGHT = 140;
const PADDING = 10;

// Where a point lands in the box, from 0 to 1 on both axes.
function place(
  points: ProgressPoint[],
  index: number,
  value: number,
): { x: number; y: number } {
  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low === 0 ? 1 : high - low;
  const step = points.length === 1 ? 0 : index / (points.length - 1);
  return {
    x: PADDING + step * (WIDTH - PADDING * 2),
    // The SVG grows downwards: the biggest value sits at the top.
    y: HEIGHT - PADDING - ((value - low) / span) * (HEIGHT - PADDING * 2),
  };
}

// Screens SUI-09 to SUI-11: the curve of an exercise, one point per
// session. Hand drawn in SVG, with no library: the same table of values is
// written underneath for the screen readers (US-39).
function ProgressChart({ points, metric }: Props) {
  if (points.length < 2) {
    return null;
  }
  const places = points.map((point, index) =>
    place(points, index, point.value),
  );
  const line = places
    .map((spot, index) => `${index === 0 ? "M" : "L"} ${spot.x} ${spot.y}`)
    .join(" ");
  const hasPartial = points.some((point) => point.is_partial);

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[140px] w-full"
        role="img"
        aria-label={describeProgressSeries(points, metric)}
      >
        <title>{describeProgressSeries(points, metric)}</title>
        <path
          d={line}
          fill="none"
          className="stroke-secondary"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {places.map((spot, index) => {
          const point = points[index];
          if (point === undefined) {
            return null;
          }
          return (
            <circle
              key={point.date}
              cx={spot.x}
              cy={spot.y}
              r="5"
              // A session given up is drawn hollow and dotted (RM-081)
              className={
                point.is_partial
                  ? "fill-base-100 stroke-secondary"
                  : "fill-secondary stroke-secondary"
              }
              strokeWidth="2"
              strokeDasharray={point.is_partial ? "3 2" : undefined}
            />
          );
        })}
      </svg>

      <div className="flex justify-between text-[11px] font-semibold text-muted">
        <span>{formatDayMonth(points[0]?.date ?? "")}</span>
        <span>{formatDayMonth(points[points.length - 1]?.date ?? "")}</span>
      </div>

      {hasPartial && (
        <p className="text-xs text-muted">
          Point en pointillé : séance inachevée.
        </p>
      )}

      {/* The same curve, read as a table (US-39, DoD). */}
      <details className="text-xs text-muted">
        <summary className="min-h-tap cursor-pointer font-semibold">
          Voir les valeurs
        </summary>
        <table className="mt-1 w-full">
          <caption className="sr-only">
            Les valeurs de la courbe, séance par séance
          </caption>
          <thead>
            <tr className="text-left">
              <th scope="col">Séance</th>
              <th scope="col">Valeur</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.date}>
                <td className="py-0.5">{formatDayMonth(point.date)}</td>
                <td className="py-0.5 font-semibold text-base-content">
                  {formatMetricValue(metric, point.value)}
                  {point.is_partial ? " (séance inachevée)" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export default ProgressChart;
