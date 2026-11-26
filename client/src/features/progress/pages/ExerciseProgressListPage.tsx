import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  addDays,
  formatDayMonth,
  type ProgressExerciseItem,
  todayInParis,
} from "shared";
import chevronRightIcon from "../../../assets/icons/ui/app/chevron-right.svg";
import searchIcon from "../../../assets/icons/ui/app/search.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import TextField from "../../../components/TextField";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { isAbortError } from "../../../services/api";
import TrackingTabs from "../../history/components/TrackingTabs";
import { readProgressExercises } from "../services/progressService";

// The mockup splits the list in two: the last fortnight, then the rest.
function groupItems(items: ProgressExerciseItem[], today: string) {
  const limit = addDays(today, -15);
  return [
    {
      title: "Moins de 15 jours",
      items: items.filter((item) => item.last_date >= limit),
    },
    {
      title: "Plus de 15 jours",
      items: items.filter((item) => item.last_date < limit),
    },
  ].filter((group) => group.items.length > 0);
}

// Screen SUI-08: the exercises already done, the most recent first, with
// their best result and a search (US-39).
function ExerciseProgressListPage() {
  const today = todayInParis();
  const [typed, setTyped] = useState("");
  const search = useDebouncedValue(typed, 300);
  const [items, setItems] = useState<ProgressExerciseItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    readProgressExercises(search, controller.signal)
      .then(setItems)
      .catch((caught: unknown) => {
        if (!isAbortError(caught)) {
          setError("Impossible de charger tes exercices.");
        }
      });
    return () => controller.abort();
  }, [search, attempt]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-2.5 px-[18px] pt-1 pb-3.5">
      <h1 className="sr-only">Progression par exercice</h1>
      <TrackingTabs current="exercices" />

      <TextField
        id="progress-search"
        label="Rechercher un exercice"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        placeholder="Ex. Squat"
        autoComplete="off"
        icon={searchIcon}
      />

      {error !== null && (
        <ErrorState
          title={error}
          message="Vérifie ta connexion internet, puis réessaie."
          onRetry={() => setAttempt((count) => count + 1)}
        />
      )}

      {items !== null && items.length === 0 && error === null && (
        <EmptyState
          title={
            search.trim() === ""
              ? "Aucun exercice réalisé"
              : "Aucun exercice trouvé"
          }
          message={
            search.trim() === ""
              ? "Tes exercices apparaîtront ici après ta première séance."
              : "Essaie un autre mot."
          }
        />
      )}

      {items !== null &&
        groupItems(items, today).map((group) => (
          <section key={group.title} className="flex flex-col gap-2">
            <h2 className="font-sans text-overline uppercase not-italic text-muted">
              {group.title}
            </h2>
            <ul className="flex flex-col gap-2">
              {group.items.map((item) => (
                <li key={item.exercise_id}>
                  <Link
                    to={`/suivi/exercices/${item.exercise_id}`}
                    className="flex min-h-[62px] items-center gap-2.5 rounded-card border border-base-300 bg-base-100 px-3.5 py-2.5 shadow-card"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <b className="truncate text-sm">{item.name}</b>
                      <span className="truncate text-xs font-medium leading-[1.45] text-muted">
                        Dernière fois le {formatDayMonth(item.last_date)}
                      </span>
                    </span>
                    {item.best !== null && (
                      <span className="shrink-0 text-sm font-extrabold">
                        {item.best}
                      </span>
                    )}
                    <Icon
                      src={chevronRightIcon}
                      className="size-[18px] shrink-0 text-faint"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

export default ExerciseProgressListPage;
