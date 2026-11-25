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

// Green when more was done than planned, red when less, grey when equal.
function gapColour(gap: string): string {
  if (gap.startsWith("▲")) {
    return "text-status-done-text";
  }
  if (gap.startsWith("▼")) {
    return "text-status-missed-text";
  }
  return "text-muted";
}

// Screen SUI-06: one exercise, set by set: done, planned, gap. A real table,
// with column headers read by screen readers, drawn as the lines of the
// mockup. The gap is always written (▲ ▼ =), never a colour alone.
function SetComparisonTable({ exercise }: Props) {
  const done = exercise.sets.filter((set) => set.validated_at !== null).length;
  const reached = countReachedObjectives(exercise.sets);
  const noun =
    getMeasureProfile(exercise.measure_codes, exercise.is_bodyweight) ===
    "cardio"
      ? "É"
      : "S";
  const captionId = `exercise-${exercise.id}`;

  return (
    <section
      aria-labelledby={captionId}
      className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id={captionId}
          className="font-sans text-[15px] font-extrabold normal-case not-italic"
        >
          {exercise.name}
        </h2>
        <p className="shrink-0 text-xs font-semibold leading-[1.45] text-muted">
          {reached} / {done} objectifs
        </p>
      </div>
      <table className="w-full">
        <caption className="sr-only">
          Séries de {exercise.name} : réalisé, prévu, écart
        </caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Série</th>
            <th scope="col">Réalisé</th>
            <th scope="col">Prévu</th>
            <th scope="col">Écart</th>
          </tr>
        </thead>
        <tbody>
          {exercise.sets.map((set, index) => {
            const isDone = set.validated_at !== null;
            const gap = isDone ? getSetGap(set) : "—";
            return (
              <tr key={set.id}>
                <th scope="row" className="py-1.5 pr-2.5">
                  <span className="sr-only">{`${noun}${index + 1}`}</span>
                  <span
                    aria-hidden="true"
                    className="grid size-5 place-items-center rounded-full bg-soft text-[10px] font-extrabold"
                  >
                    {index + 1}
                  </span>
                </th>
                <td className="w-full py-1.5 pr-2.5 text-[13px] font-bold">
                  {isDone
                    ? formatActualSide(
                        set,
                        exercise.measure_codes,
                        exercise.is_bodyweight,
                      )
                    : "Non faite"}
                </td>
                <td className="whitespace-nowrap py-1.5 pr-2.5 text-[11.5px] font-medium leading-[1.45] text-muted">
                  prévu{" "}
                  {formatPlannedSide(
                    set,
                    exercise.measure_codes,
                    exercise.is_bodyweight,
                  )}
                </td>
                <td
                  className={`w-[62px] whitespace-nowrap py-1.5 text-right text-[11.5px] font-extrabold ${gapColour(
                    gap,
                  )}`}
                >
                  {gap}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export default SetComparisonTable;
