import type { ProgramWeek } from "shared";

type Props = {
  weeks: ProgramWeek[];
};

// The colour of a week, with the sign that says the same thing (RM-064).
const WEEK_STYLE: Record<ProgramWeek["state"], string> = {
  done: "bg-status-done text-white",
  missed: "bg-status-missed/[0.12] text-status-missed-text",
  partial: "bg-status-pending/[0.12] text-status-pending-text",
  current: "bg-secondary text-secondary-content",
  coming: "border border-base-300 bg-base-100 shadow-card",
};

const WEEK_SIGN: Record<ProgramWeek["state"], string> = {
  done: "✓",
  missed: "×",
  partial: "~",
  current: "auj.",
  coming: "",
};

const WEEK_LABEL: Record<ProgramWeek["state"], string> = {
  done: "toutes faites",
  missed: "aucune faite",
  partial: "en partie faite",
  current: "semaine en cours",
  coming: "à venir",
};

// Screen PRO-07: the weeks of the program in a row of small squares, each
// with its state. The sign and the hidden words tell it too, never the
// colour alone (RM-064).
function ProgramWeekGrid({ weeks }: Props) {
  return (
    <section aria-labelledby="weeks-title" className="flex flex-col gap-2">
      <h2 id="weeks-title" className="text-[20px] leading-none">
        Semaines
      </h2>
      <ul className="grid grid-cols-6 gap-[5px]">
        {weeks.map((week) => (
          <li
            key={week.index}
            className={`flex h-11 flex-col items-center justify-center gap-0.5 rounded-btn text-xs font-extrabold ${
              WEEK_STYLE[week.state]
            }`}
          >
            S{week.index}
            <span
              aria-hidden="true"
              className="text-[9px] font-semibold opacity-80"
            >
              {WEEK_SIGN[week.state]}
            </span>
            <span className="sr-only">
              , {week.items.length} séance{week.items.length > 1 ? "s" : ""},{" "}
              {WEEK_LABEL[week.state]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ProgramWeekGrid;
