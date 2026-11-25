import { formatLongDate, type SessionChange } from "shared";

type Props = {
  // "Jambes", shown under the title with the program when there is one
  sessionName: string;
  programName: string | null;
  // The date of the appointment: the only one this change touches
  plannedDate: string;
  changes: SessionChange[];
  isSaving: boolean;
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
};

// A removed line is struck through, as on the wireframe.
const LINE_STYLE: Record<SessionChange["kind"], string> = {
  added: "",
  removed: "line-through text-muted",
  changed: "",
};

const SIGN: Record<SessionChange["kind"], string> = {
  added: "+ ",
  removed: "− ",
  changed: "",
};

// Screen CAL-06b: what the change does, before it is saved. The appointment
// is the only one touched; the sessions already done keep their own plan and
// their results (RM-058).
function SessionChangesPanel({
  sessionName,
  programName,
  plannedDate,
  changes,
  isSaving,
  error,
  onConfirm,
  onBack,
}: Props) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="border-b border-base-300 bg-base-100 p-4">
        <h1 className="text-display-md">Vérifier les changements</h1>
        <p className="text-sm text-muted">
          {programName === null
            ? `Séance libre · ${sessionName}`
            : `${programName} · ${sessionName}`}
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pb-32">
        <section
          aria-labelledby="changes-title"
          className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
        >
          <h2 id="changes-title" className="font-display text-display-sm">
            Contenu modifié
          </h2>
          {changes.length === 0 ? (
            <p className="text-muted">Rien n'a changé pour l'instant.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {changes.map((change) => (
                <li
                  key={`${change.kind}-${change.text}`}
                  className={LINE_STYLE[change.kind]}
                >
                  <span aria-hidden="true">{SIGN[change.kind]}</span>
                  <span className="sr-only">
                    {change.kind === "added"
                      ? "Ajouté : "
                      : change.kind === "removed"
                        ? "Retiré : "
                        : "Modifié : "}
                  </span>
                  {change.text}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="dates-title"
          className="flex flex-col gap-2 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
        >
          <h2 id="dates-title" className="font-display text-display-sm">
            Séances concernées · 1
          </h2>
          <p>{formatLongDate(plannedDate)}</p>
        </section>

        <p className="rounded-card border border-dashed border-base-300 p-4 text-sm text-muted">
          Les séances déjà faites ne changent pas : elles gardent leur contenu
          et leurs résultats. Pour changer une date : « Déplacer ».
        </p>

        {error !== null && (
          <p
            role="alert"
            className="rounded-card border border-status-missed bg-base-100 p-4 font-semibold"
          >
            {error}
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-base-300 bg-base-100 p-4">
        <div className="mx-auto flex max-w-md gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            className="flex h-btn flex-1 items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60"
          >
            Revenir
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving || changes.length === 0}
            className="flex h-btn flex-[1.4] items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action disabled:opacity-60"
          >
            {isSaving ? "Enregistrement…" : "Valider"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionChangesPanel;
