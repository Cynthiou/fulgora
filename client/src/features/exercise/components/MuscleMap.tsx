import {
  type ExerciseDetail,
  type ExerciseMuscle,
  formatMuscleRoleLabel,
  getExerciseMuscleMap,
  type Sex,
} from "shared";

type Props = {
  exercise: ExerciseDetail;
  sex: Sex | null;
};

// "Quadriceps · Fessiers"
function joinNames(muscles: ExerciseMuscle[]): string {
  return muscles.map((muscle) => muscle.name).join(" · ");
}

// Screen 05-1: the card "Muscles". Two lines, the role on the left in grey
// and the muscles on the right. The map (front and back in one image) comes
// above when the exercise has one; its alternative text lists the muscles,
// and when no map exists yet (D-14) the two lines alone do the job.
function MuscleMap({ exercise, sex }: Props) {
  const map = getExerciseMuscleMap(exercise, sex);
  const primary = exercise.muscles.filter(
    (muscle) => muscle.role === "primary",
  );
  const secondary = exercise.muscles.filter(
    (muscle) => muscle.role === "secondary",
  );

  const altText = [
    `Muscles sollicités : ${joinNames(primary)}`,
    secondary.length > 0 ? `secondaires : ${joinNames(secondary)}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section
      aria-labelledby="section-muscles"
      className="flex flex-col gap-2.5 rounded-card border border-base-300 bg-base-100 p-3.5 shadow-card"
    >
      <h2
        id="section-muscles"
        className="font-sans text-overline uppercase not-italic text-accent"
      >
        Muscles
      </h2>
      {map !== null && (
        <img
          src={map}
          alt={altText}
          className="mx-auto h-56 w-auto rounded-ctl bg-white object-contain"
        />
      )}
      <dl className="flex flex-col gap-2.5 text-[13px] font-medium leading-[1.5]">
        {primary.length > 0 && (
          <div className="flex gap-2.5">
            <dt className="w-21 shrink-0 text-muted">
              {formatMuscleRoleLabel("primary", primary.length)}
            </dt>
            <dd className="font-bold">{joinNames(primary)}</dd>
          </div>
        )}
        {secondary.length > 0 && (
          <div className="flex gap-2.5">
            <dt className="w-21 shrink-0 text-muted">
              {formatMuscleRoleLabel("secondary", secondary.length)}
            </dt>
            <dd>{joinNames(secondary)}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export default MuscleMap;
