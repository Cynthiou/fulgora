import { useEffect, useState } from "react";
import { formatClock, formatDuration } from "shared";
import pauseIcon from "../../../assets/icons/ui/app/pause.svg";
import playIcon from "../../../assets/icons/ui/app/play.svg";
import rotateIcon from "../../../assets/icons/ui/app/rotate.svg";
import stopIcon from "../../../assets/icons/ui/app/stop.svg";
import Icon from "../../../components/Icon";
import { useStopwatch } from "../hooks/useStopwatch";
import { useTimerAlerts } from "../hooks/useTimerAlerts";

type Props = {
  // The time planned for the set, null when nothing was planned
  plannedSeconds: number | null;
  isPending: boolean;
  // The set is over: the time held, in seconds
  onDone: (seconds: number) => void;
  // Tells the card of the set to turn dark while the time runs (B5c)
  onRunningChange?: (isRunning: boolean) => void;
};

type Mode = "countdown" | "stopwatch";

// Screens B5b and B5c: an exercise measured in time is counted by the app.
// "Minuteur" counts down from what was planned and validates the set by
// itself at zero; "Chrono" counts up and stops on demand (RM-060).
// The time always comes from the clock, so the phone may sleep (US-49).
function DurationTimer({
  plannedSeconds,
  isPending,
  onDone,
  onRunningChange,
}: Props) {
  const [mode, setMode] = useState<Mode>(
    plannedSeconds === null ? "stopwatch" : "countdown",
  );
  const watch = useStopwatch();
  const planned = plannedSeconds ?? 0;

  const secondsLeft =
    mode === "countdown" ? Math.max(0, planned - watch.elapsedSeconds) : 0;
  const isCountdownOver =
    mode === "countdown" && watch.isStarted && secondsLeft === 0;

  // The beeps of the last three seconds, only while counting down (RM-060).
  useTimerAlerts(mode === "countdown" && watch.isStarted ? secondsLeft : 99);

  // The card of the set follows the timer: white before, dark while it runs.
  useEffect(() => {
    onRunningChange?.(watch.isStarted);
  }, [watch.isStarted, onRunningChange]);

  // At zero the set validates itself, with the time that was planned.
  useEffect(() => {
    if (isCountdownOver) {
      watch.stop();
      onDone(planned);
    }
  }, [isCountdownOver, planned, onDone, watch]);

  const shown =
    mode === "countdown"
      ? formatClock(watch.isStarted ? secondsLeft : planned)
      : formatClock(watch.elapsedSeconds);
  // The last ten seconds are announced, with their beeps (B5c).
  const isFinalStretch =
    mode === "countdown" && watch.isStarted && secondsLeft <= 10;
  const caption =
    mode === "countdown"
      ? isFinalStretch
        ? `Fin dans ${secondsLeft} s · bip à 3, 2, 1`
        : `Minuteur · prévu ${formatDuration(planned)}`
      : planned > 0
        ? `Chrono · objectif ${formatDuration(planned)}`
        : "Chrono";

  if (!watch.isStarted) {
    return (
      <div className="flex w-full flex-col items-center gap-3">
        {plannedSeconds !== null && (
          <fieldset
            aria-label="Façon de compter"
            className="flex w-full gap-[3px] rounded-btn bg-track p-[3px]"
          >
            {(
              [
                ["countdown", "Minuteur ↓"],
                ["stopwatch", "Chrono ↑"],
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                type="button"
                aria-pressed={mode === code}
                onClick={() => setMode(code)}
                className={`h-9 flex-1 rounded-ctl text-[13px] font-bold ${
                  mode === code ? "bg-base-100 shadow-card" : "text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </fieldset>
        )}

        <p className="text-xs font-semibold leading-[1.45] text-muted">
          {caption}
        </p>
        <p className="font-display text-[88px] font-extrabold uppercase italic leading-none">
          {shown}
        </p>

        <button
          type="button"
          onClick={watch.start}
          disabled={isPending || (mode === "countdown" && planned === 0)}
          className="flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
        >
          <Icon src={playIcon} className="size-[18px]" />
          {mode === "countdown" ? "Lancer le minuteur" : "Lancer le chrono"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <p
        aria-live="polite"
        className="text-xs font-semibold leading-[1.45] text-pick-content/70"
      >
        {caption}
      </p>
      <p className="font-display text-[88px] font-extrabold uppercase italic leading-none">
        {shown}
      </p>

      <div className="grid w-full grid-cols-[56px_1fr_1fr] gap-2">
        <button
          type="button"
          onClick={watch.start}
          aria-label="Remettre à zéro"
          className="grid h-13 place-items-center rounded-btn border border-pick-content/20"
        >
          <Icon src={rotateIcon} className="size-5" />
        </button>
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
          onClick={() => onDone(watch.stop())}
          className="flex h-13 items-center justify-center gap-1.5 rounded-btn bg-primary text-sm font-extrabold text-primary-content disabled:opacity-60"
        >
          <Icon src={stopIcon} className="size-3.5" />
          Arrêter
        </button>
      </div>
    </div>
  );
}

export default DurationTimer;
