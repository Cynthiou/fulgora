import { useEffect, useState } from "react";
import {
  type BlockResultInput,
  formatBlockResult,
  formatClock,
  formatMinSec,
  type WorkoutBlockTree,
} from "shared";
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import playIcon from "../../../assets/icons/ui/app/play.svg";
import plusIcon from "../../../assets/icons/ui/app/plus.svg";
import Icon from "../../../components/Icon";
import NumberField from "../../../components/NumberField";
import { useCountdown } from "../hooks/useCountdown";
import { useStopwatch } from "../hooks/useStopwatch";
import { defaultAlerts } from "../hooks/useTimerAlerts";

type Props = {
  block: WorkoutBlockTree;
  isPending: boolean;
  error: string | null;
  // "Terminer le bloc": the total of the block is saved (D-06)
  onSave: (result: BlockResultInput) => void;
};

// The time a block has already taken, from the moment it was launched.
function Started({ block }: { block: WorkoutBlockTree }) {
  return (
    <p className="text-xs text-muted">
      {block.block_type === "circuit"
        ? "Enchaîne les exercices, puis marque le tour."
        : "Le minuteur tourne : marque chaque tour terminé."}
    </p>
  );
}

// Screens of the timed blocks (US-31, not drawn in the mockups): a block
// is launched by hand (RM-042), the timer follows its type, the rounds are
// counted, and the whole block is saved as one total (D-06).
function BlockTimer({ block, isPending, error, onSave }: Props) {
  const isAmrap = block.block_type === "amrap";
  const limit = block.time_limit_seconds;
  const [isRunning, setIsRunning] = useState(false);
  const [rounds, setRounds] = useState(0);
  const [extraReps, setExtraReps] = useState<number | null>(null);
  const done = formatBlockResult(block);

  if (done !== null && !isRunning) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-card border border-status-done bg-base-100 p-4 shadow-card">
        <span className="text-sm font-bold">{done}</span>
        <span aria-hidden="true" className="text-status-done-text">
          ✓
        </span>
      </div>
    );
  }

  if (!isRunning) {
    return (
      <button
        type="button"
        onClick={() => {
          setRounds(0);
          setExtraReps(null);
          setIsRunning(true);
        }}
        className="flex h-13 items-center justify-center gap-2 rounded-btn bg-primary text-sm font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action"
      >
        <Icon src={playIcon} className="size-[18px]" />
        Lancer le bloc
      </button>
    );
  }

  return (
    <RunningBlockTimer
      block={block}
      isAmrap={isAmrap}
      limit={limit}
      rounds={rounds}
      extraReps={extraReps}
      isPending={isPending}
      error={error}
      onAddRound={() => setRounds((count) => count + 1)}
      onChangeExtraReps={setExtraReps}
      onStop={(seconds) => {
        setIsRunning(false);
        onSave({
          completed_rounds:
            isAmrap || block.block_type === "circuit" ? rounds : null,
          extra_reps: isAmrap ? extraReps : null,
          actual_duration_seconds: seconds,
        });
      }}
    />
  );
}

type RunningProps = {
  block: WorkoutBlockTree;
  isAmrap: boolean;
  limit: number | null;
  rounds: number;
  extraReps: number | null;
  isPending: boolean;
  error: string | null;
  onAddRound: () => void;
  onChangeExtraReps: (value: number | null) => void;
  onStop: (seconds: number) => void;
};

// The block while it runs: an AMRAP counts down its time, a Circuit and a
// For Time count up. The hooks are only mounted here, so the time starts
// with the block and not with the screen.
function RunningBlockTimer({
  block,
  isAmrap,
  limit,
  rounds,
  extraReps,
  isPending,
  error,
  onAddRound,
  onChangeExtraReps,
  onStop,
}: RunningProps) {
  const countdown = useCountdown(isAmrap && limit !== null ? limit : 0);
  const watch = useStopwatch();

  // The stopwatch starts with the block, whatever its type: the time of
  // the block is always recorded.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only once, when the block is launched
  useEffect(() => {
    watch.start();
  }, []);

  // The end of an AMRAP is announced like the end of a rest (RM-060).
  const isOver = isAmrap && limit !== null && countdown.isOver;
  useEffect(() => {
    if (isOver) {
      defaultAlerts.beep(600);
      defaultAlerts.vibrate(400);
    }
  }, [isOver]);

  const clock =
    isAmrap && limit !== null ? countdown.secondsLeft : watch.elapsedSeconds;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
      <p
        aria-live="polite"
        className="text-center font-display text-[44px] font-extrabold uppercase italic leading-none tabular-nums"
      >
        {formatClock(clock)}
      </p>
      {isAmrap && limit !== null && (
        <p className="text-center text-xs text-muted">
          {`AMRAP de ${formatMinSec(limit)}`}
        </p>
      )}
      <Started block={block} />

      {block.block_type !== "for_time" && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">
            <b className="text-base">{rounds}</b>
            {block.planned_rounds === null
              ? " tours faits"
              : ` / ${block.planned_rounds} tours`}
          </span>
          <button
            type="button"
            onClick={onAddRound}
            className="flex h-11 items-center gap-1.5 rounded-btn border border-base-300 bg-base-100 px-4 text-sm font-bold shadow-card"
          >
            <Icon src={plusIcon} className="size-[16px]" />1 tour
          </button>
        </div>
      )}

      {isAmrap && (
        <NumberField
          id={`extra-reps-${block.id}`}
          label="Répétitions en plus"
          labelTone="muted"
          value={extraReps}
          step={1}
          min={0}
          max={1000}
          onChange={onChangeExtraReps}
          validate={() => null}
        />
      )}

      {error !== null && (
        <p
          role="alert"
          className="text-sm font-semibold text-status-missed-text"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={isPending}
        onClick={() => onStop(watch.stop())}
        className="flex h-13 items-center justify-center gap-2 rounded-btn bg-primary text-sm font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
      >
        <Icon src={checkIcon} className="size-[18px]" />
        {isPending ? "Enregistrement…" : "Terminer le bloc"}
      </button>
    </div>
  );
}

export default BlockTimer;
