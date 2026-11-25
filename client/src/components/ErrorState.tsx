import alertIcon from "../assets/icons/ui/app/alert.svg";
import rotateIcon from "../assets/icons/ui/app/rotate.svg";
import Icon from "./Icon";

type Props = {
  title?: string;
  // Optional second line, for example "Vérifie ta connexion internet, puis réessaie."
  message?: string;
  // When given, a "Réessayer" button calls it.
  onRetry?: () => void;
};

// Screen 03-5: a white card, a round red mark, what went wrong in a slanted
// title and the way to try again. role="alert" makes screen readers read it
// right away.
function ErrorState({
  title = "Une erreur est survenue.",
  message,
  onRetry,
}: Props) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3.5 rounded-card border border-base-300 bg-base-100 px-[18px] py-6 text-center shadow-card"
    >
      <span
        aria-hidden="true"
        className="grid size-16 place-items-center rounded-full bg-base-100 text-status-missed shadow-card"
      >
        <Icon src={alertIcon} className="size-7" />
      </span>
      <p className="font-display text-[26px] font-extrabold uppercase italic leading-none">
        {title}
      </p>
      {message !== undefined && (
        <p className="text-sm leading-[1.45] text-muted">{message}</p>
      )}
      {onRetry !== undefined && (
        <button
          type="button"
          onClick={onRetry}
          className="flex h-[50px] w-full items-center justify-center gap-2 rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card"
        >
          <Icon src={rotateIcon} className="size-[18px]" />
          Réessayer
        </button>
      )}
    </div>
  );
}

export default ErrorState;
