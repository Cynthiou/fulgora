import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import plusIcon from "../../../assets/icons/ui/actions/plus.svg";
import Icon from "../../../components/Icon";

type Props = {
  // The day the new session is planned for (today on the home page)
  date: string;
};

// Screen CAL-01b: the "+" of the Planning and the home page. It asks what to
// create; in the MVP the only answer is a free session (programs are US-18),
// so the panel holds that single choice.
function CreateSessionSheet({ date }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || dialog === null || dialog.open) {
      return;
    }
    const opener = document.activeElement;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus();
      }
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Ajouter une séance"
        aria-haspopup="dialog"
        className="flex size-tap items-center justify-center rounded-full bg-primary text-primary-content shadow-action"
      >
        <Icon src={plusIcon} className="size-6" />
      </button>

      {isOpen && (
        <dialog
          ref={dialogRef}
          aria-labelledby="create-session-title"
          onClose={() => setIsOpen(false)}
          className="m-auto w-[calc(100%-2rem)] max-w-md rounded-hero border border-base-300 bg-base-100 p-4 text-base-content shadow-card backdrop:bg-neutral/60"
        >
          <div className="flex items-center justify-between">
            <h2 id="create-session-title" className="text-display-sm">
              Nouvelle séance
            </h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-h-tap px-2 font-semibold text-secondary"
            >
              Fermer
            </button>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            <li>
              <Link
                to={`/seances/nouvelle?date=${date}`}
                className="flex min-h-tap flex-col rounded-card border border-base-300 p-3"
              >
                <span className="font-semibold">Séance libre</span>
                <span className="text-sm text-muted">
                  Tes blocs, tes exercices, à la date de ton choix
                </span>
              </Link>
            </li>
          </ul>
        </dialog>
      )}
    </>
  );
}

export default CreateSessionSheet;
