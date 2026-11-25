import { useEffect, useRef, useState } from "react";
import { formatClock, formatDuration } from "shared";
import { useCountdown } from "../hooks/useCountdown";
import { type Alerts, useTimerAlerts } from "../hooks/useTimerAlerts";

type Props = {
  exerciseName: string;
  // Seconds of rest, and where it comes from (the set or the exercise)
  durationSeconds: number;
  isSetRest: boolean;
  // "série 3 · prévu 10 rép. · 40 kg", or what comes after
  nextLabel: string;
  onFinish: () => void;
  alerts?: Alerts;
};

const LAST_SECONDS = 10;
// How long the "Repos terminé" state stays before the exercise comes back
const CLOSE_DELAY_MS = 1500;
// The ring of the mockup: a circle of 110 of radius, drawn 14 thick.
const RADIUS = 110;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// "1 min 30 s", "45 s", "2 min".
function formatRestTitle(seconds: number): string {
  const text = formatDuration(seconds);
  return /\d+ min \d+$/.test(text) ? `${text} s` : text;
}

// Screen B4: the rest between two sets, drawn as a ring that empties. The
// time left comes from the clock (useCountdown); the last ten seconds turn
// the frame dark; alerts ring at 3, 2, 1 and 0. Screen readers hear
// "10 secondes" then "Repos terminé".
function RestTimer({
  exerciseName,
  durationSeconds,
  isSetRest,
  nextLabel,
  onFinish,
  alerts,
}: Props) {
  const { secondsLeft, isOver, addSeconds } = useCountdown(durationSeconds);
  useTimerAlerts(secondsLeft, alerts);
  const [announcement, setAnnouncement] = useState("");
  const finished = useRef(false);

  useEffect(() => {
    if (secondsLeft === LAST_SECONDS) {
      setAnnouncement("10 secondes");
    }
  }, [secondsLeft]);

  // Over: say it, then go back to the exercise.
  useEffect(() => {
    if (!isOver || finished.current) {
      return;
    }
    finished.current = true;
    setAnnouncement("Repos terminé");
    const timer = setTimeout(onFinish, CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isOver, onFinish]);

  const isLast = !isOver && secondsLeft <= LAST_SECONDS;
  const frame = isLast
    ? "bg-neutral text-neutral-content"
    : "bg-base-200 text-base-content";
  const left = isOver ? 0 : secondsLeft;
  const done = Math.max(0, Math.min(1, left / Math.max(1, durationSeconds)));
  const stepClasses =
    "flex h-[50px] w-[110px] items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold text-base-content shadow-card disabled:opacity-60";

  return (
    <section
      aria-labelledby="rest-title"
      className={`mx-auto flex min-h-screen max-w-md flex-col px-[18px] pb-1 ${frame}`}
    >
      <div className="flex min-h-[58px] flex-col justify-center gap-[3px] pl-1.5">
        <h1 id="rest-title" className="font-display text-display-sm">
          Repos
        </h1>
        <p
          className={`text-xs font-medium leading-[1.45] ${
            isLast ? "text-neutral-content/80" : "text-muted"
          }`}
        >
          {exerciseName}
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="relative size-[250px]">
          <svg
            aria-hidden="true"
            viewBox="0 0 260 260"
            className="size-full -rotate-90"
          >
            <circle
              cx="130"
              cy="130"
              r={RADIUS}
              fill="none"
              strokeWidth="14"
              className="stroke-track"
            />
            <circle
              cx="130"
              cy="130"
              r={RADIUS}
              fill="none"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${done * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              className="stroke-secondary"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            <p
              aria-hidden="true"
              className={`font-display text-[76px] font-extrabold uppercase italic leading-none ${
                isLast ? "motion-safe:animate-pulse" : ""
              }`}
            >
              {isOver ? "0:00" : formatClock(secondsLeft)}
            </p>
            <p
              aria-hidden="true"
              className={`text-overline uppercase ${
                isLast ? "text-neutral-content/80" : "text-muted"
              }`}
            >
              sur {formatClock(durationSeconds)}
            </p>
          </div>
        </div>

        {/* Under the ring, the length of the rest and where it comes
            from (RM-023); the mockup only draws "sur 1:30". */}
        <p
          className={`text-xs font-medium ${
            isLast ? "text-neutral-content/80" : "text-muted"
          }`}
        >
          {`Repos · ${formatRestTitle(durationSeconds)} ${
            isSetRest ? "pour cette série" : "par défaut"
          }`}
        </p>

        <p aria-live="polite" className="text-sm font-semibold">
          {isOver ? "Repos terminé" : announcement}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => addSeconds(-15)}
            disabled={isOver}
            className={stepClasses}
          >
            − 15 s
          </button>
          <button
            type="button"
            onClick={() => addSeconds(15)}
            disabled={isOver}
            className={stepClasses}
          >
            + 15 s
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 pt-3">
        <p className="flex items-center gap-3 rounded-card border border-base-300 bg-base-100 p-4 text-left text-sm font-bold text-base-content shadow-card">
          <span
            aria-hidden="true"
            className="shrink-0 text-overline uppercase text-muted"
          >
            Ensuite
          </span>
          <span className="sr-only">Ensuite :</span>
          <span className="min-w-0 flex-1">{nextLabel}</span>
        </p>
        <button
          type="button"
          // "Passer le repos" closes at once; no need to wait for the alert.
          onClick={onFinish}
          className="flex h-btn w-full items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold text-base-content shadow-card"
        >
          {isOver ? "Reprendre" : "Passer le repos"}
        </button>
      </div>
    </section>
  );
}

export default RestTimer;
