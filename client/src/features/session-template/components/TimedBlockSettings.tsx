import {
  type BlockType,
  ROUNDS_LIMIT,
  ROUNDS_MESSAGE,
  TIME_LIMIT_MESSAGE,
  TIME_LIMIT_SECONDS,
} from "shared";
import MinSecField from "../../../components/MinSecField";
import NumberField from "../../../components/NumberField";

type Props = {
  blockType: BlockType;
  plannedRounds: number | null;
  timeLimitSeconds: number | null;
  onChangeRounds: (rounds: number | null) => void;
  onChangeTimeLimit: (seconds: number | null) => void;
};

// Checks a number of rounds, null when it is fine (US-43).
function validateRounds(value: number | null): string | null {
  if (value === null) {
    return null;
  }
  return Number.isInteger(value) &&
    value >= ROUNDS_LIMIT.min &&
    value <= ROUNDS_LIMIT.max
    ? null
    : ROUNDS_MESSAGE;
}

function validateTimeLimit(value: number | null): string | null {
  if (value === null) {
    return null;
  }
  return value >= TIME_LIMIT_SECONDS.min && value <= TIME_LIMIT_SECONDS.max
    ? null
    : TIME_LIMIT_MESSAGE;
}

// Screen C4: what a timed block needs. A circuit counts its rounds, an
// AMRAP runs for a fixed time, a For Time may have a time limit (RM-042).
function TimedBlockSettings({
  blockType,
  plannedRounds,
  timeLimitSeconds,
  onChangeRounds,
  onChangeTimeLimit,
}: Props) {
  return (
    <section
      aria-labelledby="timed-settings-title"
      className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
    >
      <h2 id="timed-settings-title" className="text-display-xs">
        Réglages du bloc
      </h2>

      {blockType === "circuit" && (
        <NumberField
          id="planned_rounds"
          label="Nombre de tours"
          value={plannedRounds}
          step={1}
          min={ROUNDS_LIMIT.min}
          max={ROUNDS_LIMIT.max}
          onChange={onChangeRounds}
          validate={validateRounds}
        />
      )}

      {blockType !== "circuit" && (
        <MinSecField
          id="time_limit_seconds"
          label={
            blockType === "amrap" ? "Durée (min:s)" : "Durée limite (min:s)"
          }
          value={timeLimitSeconds}
          max={TIME_LIMIT_SECONDS.max}
          step={60}
          onChange={onChangeTimeLimit}
          validate={validateTimeLimit}
        />
      )}

      <p className="text-xs leading-[1.45] text-muted">
        {blockType === "circuit" &&
          "Les exercices s'enchaînent, un objectif par tour. Le repos se prend entre les tours."}
        {blockType === "amrap" &&
          "Le plus de tours possible dans la durée, un objectif par tour."}
        {blockType === "for_time" &&
          "Le travail prévu, le plus vite possible. La durée limite est facultative."}
      </p>
    </section>
  );
}

export default TimedBlockSettings;
