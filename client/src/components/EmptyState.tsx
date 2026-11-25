import type { ReactNode } from "react";
import Icon from "./Icon";

type Props = {
  title: string;
  // h2 on its own (default), h3 inside a section that already has a title
  headingLevel?: "h2" | "h3";
  message?: string;
  // The small picture of the mockups, in its tinted box
  icon?: string;
  // Usually the one action that fills the emptiness, for example "Créer une séance".
  children?: ReactNode;
};

// Shown in place of a list or a card when there is nothing to display yet.
// The high fidelity mockups (03-1, 04-3, NOT-02v) draw it the same way: a
// white card, a tinted square of 52 px, a slanted title of 26 px, a grey
// sentence, then the action across the width.
function EmptyState({
  title,
  message,
  icon,
  children,
  headingLevel: Heading = "h2",
}: Props) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
      <div className="flex flex-col items-start gap-2.5 py-1.5">
        {icon !== undefined && (
          <span
            aria-hidden="true"
            className="grid size-[52px] place-items-center rounded-hero bg-secondary/10 text-secondary"
          >
            <Icon src={icon} className="size-6" />
          </span>
        )}
        <Heading className="text-[26px] leading-none">{title}</Heading>
        {message !== undefined && (
          <p className="text-sm leading-[1.45] text-muted">{message}</p>
        )}
      </div>
      {children !== undefined && <div className="w-full">{children}</div>}
    </div>
  );
}

export default EmptyState;
