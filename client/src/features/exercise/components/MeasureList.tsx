import type { ExerciseMeasure } from "shared";

type Props = {
  measures: ExerciseMeasure[];
};

// Screen 05: "Mesures suivies". Only the measures planned for this exercise
// are shown (RM-010); they are the fields offered when a set is planned.
function MeasureList({ measures }: Props) {
  return (
    <section aria-labelledby="section-measures" className="flex flex-col gap-2">
      <h2 id="section-measures" className="text-display-sm">
        Mesures suivies
      </h2>
      <ul className="flex flex-wrap gap-2">
        {measures.map((measure) => (
          <li
            key={measure.code}
            className="rounded-chip border border-base-300 bg-base-100 px-3 py-1 font-semibold"
          >
            {measure.label}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        Seules les mesures prévues pour cet exercice sont affichées.
      </p>
    </section>
  );
}

export default MeasureList;
