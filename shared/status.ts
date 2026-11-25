// The statuses shown everywhere (Planning, Historique, Accueil). One source
// for every page: a status is always a symbol AND a word, never a color alone.
// The symbols follow the Planning legend of the wireframes.
export const STATUS_CODES = [
  "planned",
  "completed",
  "unfinished",
  "to_confirm",
  "missed",
  "cancelled",
  "moved",
] as const;

export type StatusCode = (typeof STATUS_CODES)[number];

export type StatusInfo = {
  label: string;
  symbol: string;
};

export const STATUSES: Record<StatusCode, StatusInfo> = {
  planned: { label: "Planifiée", symbol: "□" },
  completed: { label: "Effectuée", symbol: "✓" },
  unfinished: { label: "Inachevée", symbol: "◧" },
  to_confirm: { label: "À confirmer", symbol: "?" },
  missed: { label: "Manquée", symbol: "×" },
  cancelled: { label: "Annulée", symbol: "/" },
  // Not a status of its own: an indicator added next to the real status.
  moved: { label: "Déplacée", symbol: "↷" },
};

// "✓ Effectuée", for lists and screen readers.
export function formatStatus(code: StatusCode): string {
  const { symbol, label } = STATUSES[code];
  return `${symbol} ${label}`;
}
