import type { ExerciseMeasure } from "shared";

type Props = {
  measures: ExerciseMeasure[];
};

// Screen 05-3b: "Mesures suivies", in its white card. Only the measures
// planned for this exercise are shown (RM-010); they are the fields offered
// when a set is planned.
function MeasureList({ measures }: Props) {
  return (
    <section
      aria-labelledby="section-measures"
      className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
    >
      <h2
        id="section-measures"
        className="font-sans text-overline uppercase not-italic text-accent"
      >
        Mesures suivies
      </h2>
      <ul className="flex flex-wrap gap-1.5">
        {measures.map((measure) => (
          <li
            key={measure.code}
            className="flex h-8 items-center rounded-full bg-secondary/[0.08] px-3 text-[13px] font-bold text-secondary"
          >
            {measure.label}
          </li>
        ))}
      </ul>
      <p className="text-xs leading-[1.45] text-muted">
        Seules les mesures prévues pour cet exercice sont affichées.
      </p>
    </section>
  );
}

export default MeasureList;
