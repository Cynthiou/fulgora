import type { ReactNode } from "react";
import chevronLeftIcon from "../assets/icons/ui/app/chevron-left.svg";
import Icon from "./Icon";

type Props = {
  // The big slanted line; it is the h1 of the page unless `asHeading` says no
  title: string;
  // The grey line under it, for example "Bloc 1 · Haut du corps"
  subtitle?: string;
  // What the arrow does, and what it says to a screen reader
  onBack?: () => void;
  backLabel?: string;
  // The 44 px button of the right corner (a trash, a menu…)
  action?: ReactNode;
  // False when the page already has its h1 somewhere else
  asHeading?: boolean;
};

// The header of every page without tabs (A2, A6, 05-1, B1, SUI-05…): the way
// back on the left, the name of the page in the middle, one action at most on
// the right. 58 px tall, on the colour of the page.
function PageHeader({
  title,
  subtitle,
  onBack,
  backLabel = "Retour",
  action,
  asHeading = true,
}: Props) {
  const Title = asHeading ? "h1" : "p";

  return (
    <header className="sticky top-0 z-10 flex min-h-[58px] items-center gap-1 bg-base-200 pr-3 pl-2">
      {onBack !== undefined && (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="grid size-tap shrink-0 place-items-center rounded-btn"
        >
          <Icon src={chevronLeftIcon} className="size-[22px]" />
        </button>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <Title className="truncate pt-0.5 font-display text-display-sm leading-[1.15]">
          {title}
        </Title>
        {subtitle !== undefined && (
          <span className="truncate text-xs font-medium leading-[1.45] text-muted">
            {subtitle}
          </span>
        )}
      </span>
      {action}
    </header>
  );
}

export default PageHeader;
