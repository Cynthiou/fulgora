import {
  formatComparisonValue,
  formatSetValues,
  getBlockLabel,
  type PlannedBlock,
} from "shared";

type Props = {
  blocks: PlannedBlock[];
};

// Screen SUI-06b: a session never started (missed, cancelled, to confirm):
// only the plan of its original version is shown (RM-058).
function PlannedOnlyView({ blocks }: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      {blocks.map((block, index) => (
        <section
          key={block.id}
          aria-labelledby={`planned-block-${block.id}`}
          className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
        >
          <h2
            id={`planned-block-${block.id}`}
            className="font-sans text-overline uppercase not-italic text-muted"
          >
            Prévu · {getBlockLabel(block, index)}
          </h2>
          {block.exercises.length === 0 ? (
            <p className="text-sm text-muted">Aucun exercice</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {block.exercises.map((exercise) => {
                const first = exercise.sets[0];
                const sameValues =
                  first !== undefined &&
                  exercise.sets.every(
                    (set) =>
                      formatSetValues(
                        set,
                        exercise.measure_codes,
                        exercise.is_bodyweight,
                      ) ===
                      formatSetValues(
                        first,
                        exercise.measure_codes,
                        exercise.is_bodyweight,
                      ),
                  );
                return (
                  <li
                    key={exercise.id}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
                  >
                    <span className="font-bold">{exercise.name} ·</span>
                    <span className="font-medium text-muted">
                      {exercise.sets.length === 0
                        ? "Aucune série prévue"
                        : sameValues && first !== undefined
                          ? `${exercise.sets.length} × ${formatComparisonValue(first, exercise.measure_codes, exercise.is_bodyweight)}`
                          : exercise.sets
                              .map((set) =>
                                formatComparisonValue(
                                  set,
                                  exercise.measure_codes,
                                  exercise.is_bodyweight,
                                ),
                              )
                              .join(" · ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}

      <p
        role="status"
        className="rounded-card border border-base-300 bg-base-100 p-4 text-sm leading-[1.45] text-muted shadow-card"
      >
        Aucun résultat : seul le prévu est affiché.
      </p>
    </div>
  );
}

export default PlannedOnlyView;
