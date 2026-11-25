import { useEffect, useRef } from "react";
import { formatClock, formatDuration } from "shared";
import pauseIcon from "../../../assets/icons/ui/app/pause.svg";
import playIcon from "../../../assets/icons/ui/app/play.svg";
import stopIcon from "../../../assets/icons/ui/app/stop.svg";
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
  // Tells the card of the stage to turn dark while the time runs (B5e)
  onRunningChange?: (isRunning: boolean) => void;
};

// Screens B5d and B5e: a cardio stage is launched, the stopwatch counts up,
// a beep marks the objective, and it keeps going until "Arrêter" (RM-060).
// The reading of the machine is then filled in (B5f).
function CardioStepTimer({
  plannedSeconds,
  stageLabel,
  isPending,
  onStop,
  onRunningChange,
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

  // The card of the stage follows the stopwatch (B5e).
  useEffect(() => {
    onRunningChange?.(watch.isStarted);
  }, [watch.isStarted, onRunningChange]);

  if (!watch.isStarted) {
    return (
      <button
        type="button"
        onClick={() => {
          hasBeeped.current = false;
          watch.start();
        }}
        disabled={isPending}
        className="flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
      >
        <Icon src={playIcon} className="size-[18px]" />
        Lancer l'étape
      </button>
    );
  }

  const isPastObjective =
    plannedSeconds !== null && watch.elapsedSeconds >= plannedSeconds;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <p
        aria-live="polite"
        className="text-xs font-semibold leading-[1.45] text-pick-content/70"
      >
        {stageLabel}
        {plannedSeconds === null
          ? " · chrono"
          : ` · objectif ${formatDuration(plannedSeconds)}`}
        {isPastObjective ? " · objectif atteint" : ""}
      </p>
      <p className="font-display text-[88px] font-extrabold uppercase italic leading-none">
        {formatClock(watch.elapsedSeconds)}
      </p>

      <div className="grid w-full grid-cols-2 gap-2">
        <button
          type="button"
          onClick={watch.isRunning ? watch.pause : watch.resume}
          className="flex h-13 items-center justify-center gap-1.5 rounded-btn border border-pick-content/20 text-sm font-bold"
        >
          <Icon
            src={watch.isRunning ? pauseIcon : playIcon}
            className="size-4"
          />
          {watch.isRunning ? "Pause" : "Reprendre"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => onStop(watch.stop())}
          className="flex h-13 items-center justify-center gap-1.5 rounded-btn bg-primary text-sm font-extrabold text-primary-content disabled:opacity-60"
        >
          <Icon src={stopIcon} className="size-3.5" />
          Arrêter
        </button>
      </div>
    </div>
  );
}

export default CardioStepTimer;
