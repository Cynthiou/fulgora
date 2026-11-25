import type { ComponentPropsWithRef, ReactNode } from "react";
import Icon from "./Icon";

type Props = Omit<ComponentPropsWithRef<"input">, "id" | "className"> & {
  id: string;
  label: string;
  // Short help under the field, for example "8 caractères minimum, dont un chiffre."
  help?: string;
  // The error under the field: icon + text + border, never the color alone.
  error?: ReactNode;
  // Something placed at the end of the field, for example the "Afficher" button.
  trailing?: ReactNode;
  // The small icon drawn inside the field, on the left (01-1)
  icon?: string;
};

// A labelled text input with its help and error texts, linked for screen
// readers through aria-describedby.
function TextField({
  id,
  label,
  help,
  error,
  trailing,
  icon,
  required,
  ...inputProps
}: Props) {
  const helpId = help === undefined ? undefined : `${id}-help`;
  const errorId = error === undefined ? undefined : `${id}-error`;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;
  const borderClasses =
    error === undefined
      ? "border-base-300"
      : "border-[1.5px] border-status-missed";

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-sans text-overline uppercase not-italic text-accent"
      >
        {label}
        {required ? " *" : ""}
      </label>
      <div className="relative flex items-center gap-2">
        {icon !== undefined && (
          <span className="pointer-events-none absolute left-4 text-muted">
            <Icon src={icon} className="size-[18px]" />
          </span>
        )}
        <input
          id={id}
          aria-required={required}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={describedBy}
          className={`h-field w-full min-w-0 rounded-btn border bg-base-100 text-[15px] shadow-card placeholder:text-faint ${
            icon === undefined ? "px-4" : "pr-4 pl-11"
          } ${borderClasses}`}
          {...inputProps}
        />
        {trailing}
      </div>
      {error !== undefined && (
        <p
          id={errorId}
          className="flex items-start gap-1 text-sm font-semibold"
        >
          <span aria-hidden="true" className="text-status-missed">
            ⚠
          </span>
          <span>{error}</span>
        </p>
      )}
      {help !== undefined && (
        <p id={helpId} className="text-sm text-muted">
          {help}
        </p>
      )}
    </div>
  );
}

export default TextField;
