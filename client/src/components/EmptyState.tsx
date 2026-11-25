import type { ReactNode } from "react";

type Props = {
  title: string;
  // h2 on its own (default), h3 inside a section that already has a title
  headingLevel?: "h2" | "h3";
  message?: string;
  // Usually the one action that fills the emptiness, for example "Créer une séance".
  children?: ReactNode;
};

// Shown in place of a list or a card when there is nothing to display yet.
// Left aligned, like the cards of the wireframes; the action fills the width.
function EmptyState({
  title,
  message,
  children,
  headingLevel: Heading = "h2",
}: Props) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
      <Heading className="text-display-sm">{title}</Heading>
      {message !== undefined && <p className="text-muted">{message}</p>}
      {children !== undefined && <div className="w-full">{children}</div>}
    </div>
  );
}

export default EmptyState;
