import { useEffect, useRef, useState } from "react";
import dotsIcon from "../assets/icons/ui/app/dots.svg";
import Icon from "./Icon";

export type RowAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  // A destructive action is written in red (RM-064 keeps the word too)
  isDanger?: boolean;
};

type Props = {
  // "Options de Squat à la barre"
  label: string;
  actions: RowAction[];
};

// The "⋯" of a row: the way to move an item up or down without dragging
// it, and to remove it (US-16). Escape closes, like a click outside.
function RowMenu({ label, actions }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (
        boxRef.current !== null &&
        event.target instanceof Node &&
        !boxRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  return (
    <div ref={boxRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="grid size-tap place-items-center rounded-btn text-muted"
      >
        <Icon src={dotsIcon} className="size-5" />
      </button>
      {isOpen && (
        <div className="absolute right-0 z-20 flex w-52 flex-col rounded-card border border-base-300 bg-base-100 p-1 shadow-hero">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={action.disabled}
              onClick={() => {
                setIsOpen(false);
                action.onClick();
              }}
              className={`min-h-tap rounded-btn px-3 text-left text-sm font-semibold disabled:opacity-50 ${
                action.isDanger === true ? "text-status-missed-text" : ""
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default RowMenu;
