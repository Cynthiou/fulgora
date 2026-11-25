import { useEffect, useState } from "react";
import { Link } from "react-router";
import { formatLongDate } from "shared";
import plusIcon from "../../../assets/icons/ui/app/plus.svg";
import xIcon from "../../../assets/icons/ui/app/x.svg";
import Icon from "../../../components/Icon";

type Props = {
  // The day the new session starts on: the selected day of the Planning
  date: string;
};

// Screen CAL-01b: the round button of the Planning. Closed it is a "+",
// open it becomes a "×" with the two ways to add something: a free session
// (US-23) or a program (US-18).
function CreateChoiceSheet({ date }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  // Escape closes, like the backdrop.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const longDate = formatLongDate(date).toLocaleLowerCase("fr-FR");

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Fermer le menu d'ajout"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-10 bg-neutral/60"
        />
      )}

      <div className="fixed inset-x-0 bottom-nav z-20 mx-auto flex max-w-md flex-col items-end gap-3 p-4 pr-5">
        {isOpen && (
          <div className="flex w-full flex-col gap-2">
            <Link
              to={`/seances/nouvelle?date=${date}`}
              className="flex items-center gap-3 rounded-card border border-base-300 bg-base-100 p-3 shadow-card"
            >
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-ctl border border-base-300"
              >
                <Icon src={plusIcon} className="size-5" />
              </span>
              <span className="flex flex-col">
                <span className="font-display text-display-sm">
                  Séance libre
                </span>
                <span className="text-sm text-muted">Le {longDate}</span>
              </span>
            </Link>

            <Link
              to={`/programmes/nouveau?date=${date}`}
              className="flex items-center gap-3 rounded-card border border-base-300 bg-base-100 p-3 shadow-card"
            >
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-ctl border border-base-300"
              >
                <Icon src={plusIcon} className="size-5" />
              </span>
              <span className="flex flex-col">
                <span className="font-display text-display-sm">Programme</span>
                <span className="text-sm text-muted">Débute le {longDate}</span>
              </span>
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Fermer le menu d'ajout" : "Ajouter une séance"}
          className="grid size-[58px] place-items-center rounded-fab bg-secondary text-secondary-content shadow-fab"
        >
          <Icon src={isOpen ? xIcon : plusIcon} className="size-[26px]" />
        </button>
      </div>
    </>
  );
}

export default CreateChoiceSheet;
