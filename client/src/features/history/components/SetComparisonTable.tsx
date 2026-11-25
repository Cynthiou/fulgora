import {
  countReachedObjectives,
  formatActualSide,
  formatPlannedSide,
  getMeasureProfile,
  getSetGap,
  type WorkoutExerciseTree,
} from "shared";

type Props = {
  exercise: WorkoutExerciseTree;
};

// Screen SUI-06: one exercise, set by set: planned, done, gap. A real table,
// with column headers, so a screen reader reads each cell with its meaning.
// The gap is always written (▲ ▼ =), never a colour alone.
function SetComparisonTable({ exercise }: Props) {
  const done = exercise.sets.filter((set) => set.validated_at !== null).length;
  const reached = countReachedObjectives(exercise.sets);
  const noun =
    getMeasureProfile(exercise.measure_codes) === "cardio" ? "É" : "S";
  const captionId = `exercise-${exercise.id}`;

  return (
    <section
      aria-labelledby={captionId}
      className="flex flex-col gap-2 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={captionId} className="font-semibold">
          {exercise.name}
        </h2>
        <p className="text-sm text-muted">
          {reached} / {done} objectifs
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Séries de {exercise.name} : prévu, réalisé, écart
          </caption>
          <thead>
            <tr className="text-left text-overline uppercase text-muted">
              <th scope="col" className="py-1 pr-2">
                <span className="sr-only">Série</span>
                <span aria-hidden="true">#</span>
              </th>
              <th scope="col" className="py-1 pr-2">
                Prévu
              </th>
              <th scope="col" className="py-1 pr-2">
                Réalisé
              </th>
              <th scope="col" className="py-1">
                Écart
              </th>
            </tr>
          </thead>
          <tbody>
            {exercise.sets.map((set, index) => {
              const isDone = set.validated_at !== null;
              return (
                <tr key={set.id} className="border-t border-base-300">
                  <th scope="row" className="py-2 pr-2 font-semibold">
                    {noun}
                    {index + 1}
                  </th>
                  <td className="py-2 pr-2 text-muted">
                    {formatPlannedSide(set, exercise.measure_codes)}
                  </td>
                  <td className="py-2 pr-2 font-semibold">
                    {isDone
                      ? formatActualSide(set, exercise.measure_codes)
                      : "Non faite"}
                  </td>
                  <td className="py-2 font-semibold">
                    {isDone ? getSetGap(set) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default SetComparisonTable;
