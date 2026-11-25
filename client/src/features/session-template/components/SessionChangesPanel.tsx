import { formatLongDate, type SessionChange } from "shared";
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import Icon from "../../../components/Icon";
import PageHeader from "../../../components/PageHeader";

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

// The tinted square of each kind of change (CAL-06b).
const LINE_STYLE: Record<SessionChange["kind"], string> = {
  added: "bg-status-done/[0.12] text-status-done-text",
  removed: "bg-status-missed/[0.12] text-status-missed-text",
  changed: "bg-secondary/[0.12] text-secondary",
};

const SIGN: Record<SessionChange["kind"], string> = {
  added: "+",
  removed: "−",
  changed: "~",
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
      <PageHeader
        onBack={onBack}
        backLabel="Revenir à l'éditeur"
        title="Vérifier les changements"
        subtitle={
          programName === null
            ? `Séance libre · ${sessionName}`
            : `${programName} · ${sessionName}`
        }
      />

      <div className="flex flex-1 flex-col gap-2.5 px-[18px] pt-1 pb-32">
        <section
          aria-labelledby="changes-title"
          className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
        >
          <h2
            id="changes-title"
            className="font-sans text-overline uppercase not-italic text-accent"
          >
            Contenu modifié
          </h2>
          {changes.length === 0 ? (
            <p className="text-sm text-muted">
              Rien n'a changé pour l'instant.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {changes.map((change) => (
                <li
                  key={`${change.kind}-${change.text}`}
                  className="flex items-center gap-2.5 text-[13px] font-semibold"
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-[22px] shrink-0 place-items-center rounded-ctl text-[13px] font-extrabold ${
                      LINE_STYLE[change.kind]
                    }`}
                  >
                    {SIGN[change.kind]}
                  </span>
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
          className="flex flex-col gap-2.5 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2
              id="dates-title"
              className="font-sans text-overline uppercase not-italic text-accent"
            >
              Séances concernées
            </h2>
            <span className="text-[13px] font-extrabold">1</span>
          </div>
          <p className="text-sm">{formatLongDate(plannedDate)}</p>
        </section>

        <p className="px-1 text-xs leading-[1.45] text-muted">
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

      <div className="fixed inset-x-0 bottom-0 px-[18px] pt-3 pb-1">
        <div className="mx-auto grid max-w-md grid-cols-[1fr_1.6fr] gap-2.5">
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            className="flex h-btn items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card disabled:opacity-60"
          >
            Revenir
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving || changes.length === 0}
            className="flex h-btn items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
          >
            <Icon src={checkIcon} className="size-[18px]" />
            {isSaving ? "Enregistrement…" : "Valider"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionChangesPanel;
