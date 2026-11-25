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
    <div className="flex flex-col gap-4">
      <p role="status" className="text-muted">
        Aucun résultat : seul le prévu est affiché.
      </p>
      {blocks.map((block, index) => (
        <section
          key={block.id}
          aria-labelledby={`planned-block-${block.id}`}
          className="flex flex-col gap-2"
        >
          <h2
            id={`planned-block-${block.id}`}
            className="font-sans text-overline not-italic uppercase text-accent"
          >
            Prévu · {getBlockLabel(block, index)}
          </h2>
          {block.exercises.length === 0 ? (
            <p className="text-sm text-muted">Aucun exercice</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {block.exercises.map((exercise) => {
                const first = exercise.sets[0];
                const sameValues =
                  first !== undefined &&
                  exercise.sets.every(
                    (set) =>
                      formatSetValues(set, exercise.measure_codes) ===
                      formatSetValues(first, exercise.measure_codes),
                  );
                return (
                  <li
                    key={exercise.id}
                    className="flex flex-col gap-1 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
                  >
                    <span className="font-semibold">{exercise.name}</span>
                    <span className="text-sm text-muted">
                      {exercise.sets.length === 0
                        ? "Aucune série prévue"
                        : sameValues && first !== undefined
                          ? `${exercise.sets.length} × ${formatComparisonValue(first, exercise.measure_codes)}`
                          : exercise.sets
                              .map((set) =>
                                formatComparisonValue(
                                  set,
                                  exercise.measure_codes,
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
    </div>
  );
}

export default PlannedOnlyView;
