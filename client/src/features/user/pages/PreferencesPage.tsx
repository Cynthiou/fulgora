import { useNavigate } from "react-router";
import {
  DISTANCE_UNIT_LABELS,
  DISTANCE_UNITS,
  type DistanceUnit,
  formatPreferencesPreview,
  HOME_METRIC_LABELS,
  HOME_METRICS,
  WEIGHT_UNIT_LABELS,
  WEIGHT_UNITS,
  type WeightUnit,
} from "shared";
import ErrorState from "../../../components/ErrorState";
import PageHeader from "../../../components/PageHeader";
import { usePreferences } from "../hooks/usePreferences";

// A segmented control of two units (kg / lb, km / mi). Real radio buttons,
// invisible over their label: the keyboard and the screen readers follow.
type SegmentedProps<T extends string> = {
  name: string;
  legend: string;
  options: readonly T[];
  labels: Record<T, string>;
  current: T;
  isSaving: boolean;
  onChoose: (value: T) => void;
};

function Segmented<T extends string>({
  name,
  legend,
  options,
  labels,
  current,
  isSaving,
  onChoose,
}: SegmentedProps<T>) {
  return (
    <fieldset disabled={isSaving} className="flex flex-col gap-[7px]">
      <legend className="font-sans text-overline uppercase not-italic text-accent">
        {legend}
      </legend>
      <div className="flex gap-[3px] rounded-btn bg-track p-[3px]">
        {options.map((option) => (
          <label
            key={option}
            className={`relative grid h-[38px] flex-1 cursor-pointer place-items-center rounded-ctl text-sm font-bold focus-within:ring-2 focus-within:ring-secondary ${
              option === current ? "bg-base-100 shadow-card" : "text-muted"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={option === current}
              onChange={() => onChoose(option)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            {labels[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Screen PRF-03: the units and the indicator of the home page. Each change
// is saved at once; only the screens change, the database keeps kilograms
// and meters (DT-11).
function PreferencesPage() {
  const navigate = useNavigate();
  const { preferences, isSaving, error, save } = usePreferences();

  if (preferences === null) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={() => navigate("/profil")}
        backLabel="Retour au profil"
        title="Affichage"
      />

      <div className="flex flex-1 flex-col gap-3 px-[18px] pt-1 pb-6">
        <Segmented<WeightUnit>
          name="weight-unit"
          legend="Unité de poids"
          options={WEIGHT_UNITS}
          labels={WEIGHT_UNIT_LABELS}
          current={preferences.weight_unit}
          isSaving={isSaving}
          onChoose={(weight_unit) => void save({ weight_unit })}
        />

        <Segmented<DistanceUnit>
          name="distance-unit"
          legend="Unité de distance"
          options={DISTANCE_UNITS}
          labels={DISTANCE_UNIT_LABELS}
          current={preferences.distance_unit}
          isSaving={isSaving}
          onChoose={(distance_unit) => void save({ distance_unit })}
        />

        {/* D-04: the three indicators, "Aucun" included. */}
        <fieldset disabled={isSaving} className="flex flex-col gap-[7px]">
          <legend className="font-sans text-overline uppercase not-italic text-accent">
            Indicateur à l'Accueil
          </legend>
          <div className="overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card">
            {HOME_METRICS.map((metric, index) => (
              <label
                key={metric}
                className={`flex min-h-14 cursor-pointer items-center gap-3 px-[14px] text-[15px] font-semibold focus-within:bg-soft ${
                  index === 0 ? "" : "border-t border-base-300"
                }`}
              >
                <span className="flex-1">{HOME_METRIC_LABELS[metric]}</span>
                <input
                  type="radio"
                  name="home-metric"
                  value={metric}
                  checked={metric === preferences.home_metric}
                  onChange={() => void save({ home_metric: metric })}
                  className="size-[22px] shrink-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-base-300 checked:border-[6px] checked:border-secondary"
                />
              </label>
            ))}
          </div>
        </fieldset>

        {error !== null && <ErrorState title={error} />}

        {/* APERÇU: the same example as the mockup, in the chosen units. */}
        <section
          aria-labelledby="preview-title"
          className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
        >
          <h2
            id="preview-title"
            className="font-sans text-overline uppercase not-italic text-muted"
          >
            Aperçu
          </h2>
          {formatPreferencesPreview(preferences).map((line) => (
            <p key={line.label} className="text-[13px] leading-[1.45]">
              {`${line.label} · `}
              <b>{line.value}</b>
            </p>
          ))}
        </section>

        <p className="text-xs leading-[1.45] text-muted">
          Seul l'affichage change. Tes séances restent enregistrées en
          kilogrammes et en kilomètres.
        </p>
      </div>
    </div>
  );
}

export default PreferencesPage;
