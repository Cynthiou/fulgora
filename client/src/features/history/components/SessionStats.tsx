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
    <dl className="grid grid-cols-3 gap-2 rounded-card border border-base-300 bg-base-100 p-4 text-center shadow-card">
      <div className="flex flex-col">
        <dd className="font-display text-display-sm">
          {formatSummaryDuration(
            computeDurationSeconds(workout.started_at, workout.ended_at),
          )}
        </dd>
        <dt className="text-overline uppercase text-muted">durée</dt>
      </div>
      {tonnage > 0 && (
        <div className="flex flex-col">
          <dd className="font-display text-display-sm">
            {formatTonnage(tonnage)}
          </dd>
          <dt className="text-overline uppercase text-muted">tonnage</dt>
        </div>
      )}
      <div className="flex flex-col">
        <dd className="font-display text-display-sm">
          {countReachedObjectives(sets)} / {validated}
        </dd>
        <dt className="text-overline uppercase text-muted">objectifs</dt>
      </div>
    </dl>
  );
}

export default SessionStats;
