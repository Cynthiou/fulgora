import { useEffect, useRef } from "react";
import { formatClock, formatDuration } from "shared";
import playIcon from "../../../assets/icons/ui/navigation/player-play.svg";
import pauseIcon from "../../../assets/icons/ui/session/player-pause.svg";
import Icon from "../../../components/Icon";
import { useStopwatch } from "../hooks/useStopwatch";
import { defaultAlerts } from "../hooks/useTimerAlerts";

type Props = {
  // The time planned for the stage, null when nothing was planned
  plannedSeconds: number | null;
  stageLabel: string;
  isPending: boolean;
  // The stage is over: the time measured opens the machine reading (B5f)
  onStop: (seconds: number) => void;
};

// Screens B5d and B5e: a cardio stage is launched, the stopwatch counts up,
// a beep marks the objective, and it keeps going until "Arrêter" (RM-060).
// The reading of the machine is then filled in (B5f).
function CardioStepTimer({
  plannedSeconds,
  stageLabel,
  isPending,
  onStop,
}: Props) {
  const watch = useStopwatch();
  const hasBeeped = useRef(false);

  // One beep when the planned time is reached; the stopwatch does not stop.
  useEffect(() => {
    if (
      plannedSeconds !== null &&
      watch.isStarted &&
      !hasBeeped.current &&
      watch.elapsedSeconds >= plannedSeconds
    ) {
      hasBeeped.current = true;
      defaultAlerts.beep(600);
      defaultAlerts.vibrate(400);
    }
  }, [plannedSeconds, watch.isStarted, watch.elapsedSeconds]);

  if (!watch.isStarted) {
    return (
      <button
        type="button"
        onClick={() => {
          hasBeeped.current = false;
          watch.start();
        }}
        disabled={isPending}
        className="flex h-btn w-full items-center justify-center gap-2 rounded-btn bg-neutral font-extrabold uppercase tracking-wide text-neutral-content disabled:opacity-60"
      >
        <Icon src={playIcon} className="size-5" />
        Lancer l'étape
      </button>
    );
  }

  const isPastObjective =
    plannedSeconds !== null && watch.elapsedSeconds >= plannedSeconds;

  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-neutral p-4 text-neutral-content">
      <p aria-live="polite" className="text-sm">
        {stageLabel}
        {plannedSeconds === null
          ? " · chrono"
          : ` · objectif ${formatDuration(plannedSeconds)}`}
        {isPastObjective ? " · objectif atteint" : ""}
      </p>
      <p className="font-display text-display-xl leading-none">
        {formatClock(watch.elapsedSeconds)}
      </p>

      <div className="flex w-full gap-2">
        <button
          type="button"
          onClick={watch.isRunning ? watch.pause : watch.resume}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-btn border border-neutral-content font-semibold"
        >
          <Icon
            src={watch.isRunning ? pauseIcon : playIcon}
            className="size-5"
          />
          {watch.isRunning ? "Pause" : "Reprendre"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => onStop(watch.stop())}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-btn bg-base-100 font-semibold text-base-content disabled:opacity-60"
        >
          <span aria-hidden="true">■</span> Arrêter
        </button>
      </div>
    </div>
  );
}

export default CardioStepTimer;
