import {
  computeDurationSeconds,
  computeTonnage,
  countReachedObjectives,
  countValidatedSets,
  formatSummaryDuration,
  formatTonnage,
  type WorkoutSessionTree,
} from "shared";

type Props = {
  workout: WorkoutSessionTree;
};

// Screen SUI-06: duration, tonnage (only when weights were moved) and
// objectives reached, all computed from the results (RM-051).
function SessionStats({ workout }: Props) {
  const sets = workout.blocks.flatMap((block) =>
    block.exercises.flatMap((exercise) => exercise.sets),
  );
  const tonnage = computeTonnage(sets);
  const validated = countValidatedSets(workout);

  return (
    <dl className="grid grid-cols-3 gap-2">
      {[
        {
          key: "duree",
          value: formatSummaryDuration(
            computeDurationSeconds(workout.started_at, workout.ended_at),
          ),
          label: "durée",
        },
        ...(tonnage > 0
          ? [
              {
                key: "tonnage",
                value: formatTonnage(tonnage),
                label: "tonnage",
              },
            ]
          : []),
        {
          key: "objectifs",
          value: `${countReachedObjectives(sets)} / ${validated}`,
          label: "objectifs",
        },
      ].map((figure) => (
        <div
          key={figure.key}
          className="flex flex-col gap-[3px] rounded-card border border-base-300 bg-base-100 p-3 shadow-card"
        >
          <dd className="font-display text-[22px] font-extrabold uppercase italic leading-none">
            {figure.value}
          </dd>
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {figure.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}

export default SessionStats;
