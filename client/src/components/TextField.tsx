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
  // "form": the 46 px field of the program and session forms (handoff v3)
  variant?: "page" | "form";
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
  variant = "page",
  ...inputProps
}: Props) {
  const isForm = variant === "form";
  const helpId = help === undefined ? undefined : `${id}-help`;
  const errorId = error === undefined ? undefined : `${id}-error`;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;
  const borderClasses =
    error === undefined
      ? "border-base-300"
      : "border-[1.5px] border-status-missed";

  return (
    <div className={`flex flex-col ${isForm ? "gap-[9px]" : "gap-1.5"}`}>
      <label
        htmlFor={id}
        className={
          isForm
            ? "text-[10px] font-extrabold uppercase leading-[1.2] tracking-[0.14em] text-accent"
            : "font-sans text-overline uppercase not-italic text-accent"
        }
      >
        {label}
        {required ? " *" : ""}
      </label>
      <div className="relative flex items-center gap-2">
        {icon !== undefined && (
          <span
            className={`pointer-events-none absolute text-muted ${
              isForm ? "left-3" : "left-4"
            }`}
          >
            <Icon
              src={icon}
              className={isForm ? "size-[15px]" : "size-[18px]"}
            />
          </span>
        )}
        <input
          id={id}
          aria-required={required}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={describedBy}
          className={`w-full min-w-0 border bg-base-100 ${
            isForm
              ? "h-[46px] rounded-[12px] text-sm font-medium placeholder:text-faint focus:border-accent focus:outline-none"
              : "h-field rounded-btn text-[15px] shadow-card placeholder:text-faint"
          } ${
            icon === undefined
              ? isForm
                ? "px-[14px]"
                : "px-4"
              : isForm
                ? "pr-3 pl-[37px]"
                : "pr-4 pl-11"
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
