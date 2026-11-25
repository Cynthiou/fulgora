import { useEffect, useState } from "react";
import { formatClock, formatDuration } from "shared";
import rotateIcon from "../../../assets/icons/ui/actions/rotate.svg";
import playIcon from "../../../assets/icons/ui/navigation/player-play.svg";
import pauseIcon from "../../../assets/icons/ui/session/player-pause.svg";
import Icon from "../../../components/Icon";
import { useStopwatch } from "../hooks/useStopwatch";
import { useTimerAlerts } from "../hooks/useTimerAlerts";

type Props = {
  // The time planned for the set, null when nothing was planned
  plannedSeconds: number | null;
  isPending: boolean;
  // The set is over: the time held, in seconds
  onDone: (seconds: number) => void;
};

type Mode = "countdown" | "stopwatch";

// Screens B5b and B5c: an exercise measured in time is counted by the app.
// "Minuteur" counts down from what was planned and validates the set by
// itself at zero; "Chrono" counts up and stops on demand (RM-060).
// The time always comes from the clock, so the phone may sleep (US-49).
function DurationTimer({ plannedSeconds, isPending, onDone }: Props) {
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

  // The last ten seconds turn the box black (B5c).
  const isFinalStretch =
    mode === "countdown" && watch.isStarted && secondsLeft <= 10;

  if (!watch.isStarted) {
    return (
      <div className="flex flex-col gap-3">
        {plannedSeconds !== null && (
          <fieldset
            aria-label="Façon de compter"
            className="grid grid-cols-2 overflow-hidden rounded-btn border border-base-300"
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
                className={`min-h-tap font-semibold ${
                  mode === code
                    ? "bg-neutral text-neutral-content"
                    : "bg-base-100"
                }`}
              >
                {label}
              </button>
            ))}
          </fieldset>
        )}

        <div className="flex flex-col items-center gap-2 rounded-card border border-base-300 p-4">
          <p className="text-sm text-muted">
            {mode === "countdown"
              ? `Minuteur · prévu ${formatDuration(planned)}`
              : plannedSeconds === null
                ? "Chrono"
                : `Chrono · objectif ${formatDuration(planned)}`}
          </p>
          <p className="font-display text-display-xl leading-none">{shown}</p>
        </div>

        <button
          type="button"
          onClick={watch.start}
          disabled={isPending || (mode === "countdown" && planned === 0)}
          className="flex h-btn w-full items-center justify-center gap-2 rounded-btn bg-neutral font-extrabold uppercase tracking-wide text-neutral-content disabled:opacity-60"
        >
          <Icon src={playIcon} className="size-5" />
          {mode === "countdown" ? "Lancer le minuteur" : "Lancer le chrono"}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-card p-4 ${
        isFinalStretch
          ? "bg-neutral text-neutral-content"
          : "border border-base-300"
      }`}
    >
      <p
        aria-live="polite"
        className={isFinalStretch ? "text-sm" : "text-sm text-muted"}
      >
        {mode === "countdown"
          ? isFinalStretch
            ? `Fin dans ${secondsLeft} s · bip à 3, 2, 1`
            : `Minuteur · prévu ${formatDuration(planned)}`
          : planned > 0
            ? `Chrono · objectif ${formatDuration(planned)}`
            : "Chrono"}
      </p>
      <p className="font-display text-display-xl leading-none">{shown}</p>

      <div className="flex w-full items-center gap-2">
        <button
          type="button"
          onClick={watch.start}
          aria-label="Remettre à zéro"
          className={`flex size-tap shrink-0 items-center justify-center rounded-btn ${
            isFinalStretch ? "" : "text-secondary"
          }`}
        >
          <Icon src={rotateIcon} className="size-5" />
        </button>
        <button
          type="button"
          onClick={watch.isRunning ? watch.pause : watch.resume}
          className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-btn border font-semibold ${
            isFinalStretch
              ? "border-neutral-content"
              : "border-base-300 bg-base-100"
          }`}
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
          onClick={() => onDone(watch.stop())}
          className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-btn font-semibold disabled:opacity-60 ${
            isFinalStretch
              ? "bg-base-100 text-base-content"
              : "border border-base-300 bg-base-100"
          }`}
        >
          <span aria-hidden="true">■</span> Arrêter
        </button>
      </div>
    </div>
  );
}

export default DurationTimer;
