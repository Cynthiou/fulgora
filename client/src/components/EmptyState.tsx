import type { ReactNode } from "react";

type Props = {
  title: string;
  message?: string;
  // Usually the one action that fills the emptiness, for example "Créer une séance".
  children?: ReactNode;
};

// Shown in place of a list or a card when there is nothing to display yet.
function EmptyState({ title, message, children }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-base-300 bg-base-100 p-6 text-center shadow-card">
      <h2 className="text-display-sm">{title}</h2>
      {message !== undefined && <p className="text-muted">{message}</p>}
      {children}
    </div>
  );
}

export default EmptyState;
