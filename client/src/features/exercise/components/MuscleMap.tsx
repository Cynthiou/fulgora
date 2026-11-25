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

// Screen 05: the muscle map (front and back in one image) and the muscles
// written under it. The image's alternative text lists the muscles too, and
// when no map exists yet (D-14) the text alone does the job.
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
    <div className="flex flex-col gap-3">
      {map !== null && (
        <img
          src={map}
          alt={altText}
          className="mx-auto h-56 w-auto rounded-ctl bg-soft"
        />
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {primary.length > 0 && (
          <>
            <dt className="text-overline uppercase text-accent">
              {formatMuscleRoleLabel("primary", primary.length)}
            </dt>
            <dd className="font-semibold">{joinNames(primary)}</dd>
          </>
        )}
        {secondary.length > 0 && (
          <>
            <dt className="text-overline uppercase text-accent">
              {formatMuscleRoleLabel("secondary", secondary.length)}
            </dt>
            <dd className="text-muted">{joinNames(secondary)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

export default MuscleMap;
