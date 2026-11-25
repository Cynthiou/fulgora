import type { ReactNode } from "react";
import Icon from "./Icon";

type Props = {
  title: string;
  // h2 on its own (default), h3 inside a section that already has a title
  headingLevel?: "h2" | "h3";
  message?: string;
  // The small picture of the mockups, in its tinted box
  icon?: string;
  // CAL-03e centres the block and draws a slightly bigger box; 03-1 and
  // 04-3 keep it against the left edge.
  centered?: boolean;
  // NOT-02v: no card at all, a round icon in the middle of the page
  plain?: boolean;
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
  centered = false,
  plain = false,
  children,
  headingLevel: Heading = "h2",
}: Props) {
  if (plain) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 text-center">
        {icon !== undefined && (
          <span
            aria-hidden="true"
            className="grid size-[72px] place-items-center rounded-full bg-base-100 text-base-content shadow-card"
          >
            <Icon src={icon} className="size-7" />
          </span>
        )}
        <Heading className="pt-1 text-[26px] leading-none">{title}</Heading>
        {message !== undefined && (
          <p className="text-sm leading-[1.45] text-muted">{message}</p>
        )}
        {children !== undefined && <div className="w-full">{children}</div>}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card ${
        centered ? "items-center" : "items-start"
      }`}
    >
      <div
        className={`flex flex-col gap-2.5 ${
          centered ? "items-center py-2.5 text-center" : "items-start py-1.5"
        }`}
      >
        {icon !== undefined && (
          <span
            aria-hidden="true"
            className={`grid place-items-center rounded-hero bg-secondary/10 text-secondary ${
              centered ? "size-14" : "size-[52px]"
            }`}
          >
            <Icon src={icon} className={centered ? "size-7" : "size-6"} />
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
