import { formatMuscleSets, type MuscleSets } from "shared";

type Props = {
  muscles: MuscleSets[];
};

// Screens SUI-01 and SUI-02s: how many sets each muscle took over the
// period. A main muscle counts one set, a secondary one a half (RM-078);
// cardio and stretching are left out (D-19).
function MuscleSetsCard({ muscles }: Props) {
  const highest = muscles.reduce(
    (most, muscle) => Math.max(most, muscle.sets),
    0,
  );

  return (
    <section
      aria-labelledby="muscles-title"
      className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="muscles-title" className="text-display-xs">
          Muscles · séries
        </h2>
        <p className="text-xs font-semibold text-muted">
          principal = 1 · secondaire = ½
        </p>
      </div>

      {muscles.length === 0 ? (
        <p className="text-sm text-muted">
          Aucun muscle travaillé sur cette période.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {muscles.map((muscle) => (
            <li key={muscle.code} className="flex items-center gap-2.5">
              <span className="w-[108px] shrink-0 truncate text-sm">
                {muscle.name}
              </span>
              <span
                aria-hidden="true"
                className="h-1.5 flex-1 overflow-hidden rounded-chip bg-track"
              >
                <span
                  className="block h-full rounded-chip bg-secondary"
                  style={{
                    width: `${
                      highest === 0
                        ? 0
                        : Math.round((muscle.sets / highest) * 100)
                    }%`,
                  }}
                />
              </span>
              <b className="w-10 shrink-0 text-right text-sm">
                {formatMuscleSets(muscle.sets)}
              </b>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs leading-[1.45] text-muted">
        Principal = 1 série, secondaire = ½ série. Cardio et mobilité non
        comptés.
      </p>
    </section>
  );
}

export default MuscleSetsCard;
