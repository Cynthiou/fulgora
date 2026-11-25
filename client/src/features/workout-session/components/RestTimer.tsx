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

// "1 min 30 s", "45 s", "2 min".
function formatRestTitle(seconds: number): string {
  const text = formatDuration(seconds);
  return /\d+ min \d+$/.test(text) ? `${text} s` : text;
}

// Screen B4: the rest between two sets. The time left comes from the clock
// (useCountdown); the last ten seconds turn the frame dark; alerts ring at
// 3, 2, 1 and 0. Screen readers hear "10 secondes" then "Repos terminé".
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

  return (
    <section
      aria-labelledby="rest-title"
      className={`mx-auto flex min-h-screen max-w-md flex-col items-center justify-between p-6 text-center ${frame}`}
    >
      <div className="flex w-full flex-col gap-1 text-left">
        <h1 id="rest-title" className="text-display-md">
          Repos
        </h1>
        <p className={isLast ? "text-neutral-content/80" : "text-muted"}>
          {exerciseName}
        </p>
      </div>

      <div className="flex w-full flex-col items-center gap-6">
        <p className={isLast ? "text-neutral-content/80" : "text-muted"}>
          Repos · {formatRestTitle(durationSeconds)}
          {isSetRest ? " pour cette série" : " par défaut"}
        </p>
        <p
          aria-hidden="true"
          className={`font-display text-[5rem] leading-none ${
            isLast ? "motion-safe:animate-pulse" : ""
          }`}
        >
          {isOver ? "0:00" : formatClock(secondsLeft)}
        </p>
        <p aria-live="polite" className="font-semibold">
          {isOver ? "Repos terminé" : announcement}
        </p>
        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={() => addSeconds(-15)}
            disabled={isOver}
            className="h-12 flex-1 rounded-btn border border-base-300 bg-base-100 font-semibold text-base-content disabled:opacity-60"
          >
            − 15 s
          </button>
          <button
            type="button"
            onClick={() => addSeconds(15)}
            disabled={isOver}
            className="h-12 flex-1 rounded-btn border border-base-300 bg-base-100 font-semibold text-base-content disabled:opacity-60"
          >
            + 15 s
          </button>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        <p className={isLast ? "text-neutral-content/80" : "text-muted"}>
          Ensuite : {nextLabel}
        </p>
        <button
          type="button"
          // "Passer le repos" closes at once; no need to wait for the alert.
          onClick={onFinish}
          className="flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action"
        >
          {isOver ? "Reprendre" : "Passer le repos"}
        </button>
      </div>
    </section>
  );
}

export default RestTimer;
