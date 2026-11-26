import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";
import gripIcon from "../assets/icons/ui/app/grip.svg";
import Icon from "./Icon";

type Item = {
  // Unique inside the list; the key of the draft, never stored
  id: string;
  // "Squat à la barre": said by the handle and by the announcements
  label: string;
  content: ReactNode;
};

type Props = {
  // Read by the screen reader when the list takes the focus
  label: string;
  items: Item[];
  onMove: (from: number, to: number) => void;
  // The row of the list: the handle is given to it
  renderRow: (item: Item, handle: ReactNode) => ReactNode;
  // The space between two rows ("gap-0" for rows glued in one card)
  gapClass?: string;
  // What the grip shows: the grip icon in a 44 px square by default. A
  // screen that already draws the number of the row makes that badge the
  // grip instead (handoff 3.2), so nothing is added to the card.
  renderHandleContent?: (position: number) => ReactNode;
  handleClass?: string;
  // What the grip says. A grip that shows something must say it too, or
  // its name does not hold its visible text (RM-064, WCAG "Label in Name").
  handleLabel?: (label: string, position: number) => string;
  // "f" for a feminine item (une série), so the announcements agree
  gender?: "m" | "f";
};

// Screens A6, A8 and PRO-03: a list whose rows can be moved. The handle
// works with the finger, the mouse and the keyboard (space to take, arrows
// to move, space to drop, Escape to cancel); every move is announced in
// French (US-16).
function SortableList({
  label,
  items,
  onMove,
  renderRow,
  gapClass = "gap-2",
  gender = "m",
  renderHandleContent,
  handleClass,
  handleLabel,
}: Props) {
  // "saisi" or "saisie", "le déplacer" or "la déplacer"
  const end = gender === "f" ? "e" : "";
  const pronoun = gender === "f" ? "la" : "le";
  const sensors = useSensors(
    // A small distance first, so a tap on the row still opens it.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over === null || active.id === over.id) {
      return;
    }
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from !== -1 && to !== -1) {
      onMove(from, to);
    }
  }

  // The words the screen reader says at every step of a move.
  const announcements = {
    onDragStart: ({ active }: { active: { id: string | number } }) =>
      `${nameOf(items, active.id)} saisi${end}. Utilise les flèches pour ${pronoun} déplacer.`,
    onDragOver: ({
      active,
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) =>
      over === null
        ? undefined
        : `${nameOf(items, active.id)} déplacé${end} en position ${
            positionOf(items, over.id) + 1
          } sur ${items.length}.`,
    onDragEnd: ({
      active,
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) =>
      over === null
        ? `${nameOf(items, active.id)} reposé${end} à sa place.`
        : `${nameOf(items, active.id)} déplacé${end} en position ${
            positionOf(items, over.id) + 1
          } sur ${items.length}.`,
    onDragCancel: ({ active }: { active: { id: string | number } }) =>
      `Déplacement annulé. ${nameOf(items, active.id)} reste à sa place.`,
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      accessibility={{ announcements }}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul aria-label={label} className={`flex flex-col ${gapClass}`}>
          {items.map((item, position) => (
            <SortableRow
              key={item.id}
              item={item}
              position={position}
              renderRow={renderRow}
              renderHandleContent={renderHandleContent}
              handleClass={handleClass}
              handleLabel={handleLabel}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function nameOf(items: Item[], id: string | number): string {
  return items.find((item) => item.id === id)?.label ?? "Élément";
}

function positionOf(items: Item[], id: string | number): number {
  return items.findIndex((item) => item.id === id);
}

type RowProps = {
  item: Item;
  // Place in the list, from 0: the number the grip may show
  position: number;
  renderRow: Props["renderRow"];
  renderHandleContent: Props["renderHandleContent"];
  handleClass: Props["handleClass"];
  handleLabel: Props["handleLabel"];
};

function SortableRow({
  item,
  position,
  renderRow,
  renderHandleContent,
  handleClass,
  handleLabel,
}: RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const handle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label={
        handleLabel === undefined
          ? `Déplacer ${item.label}`
          : handleLabel(item.label, position)
      }
      className={
        handleClass ??
        "grid size-tap shrink-0 cursor-grab touch-none place-items-center text-faint"
      }
    >
      {renderHandleContent === undefined ? (
        <Icon src={gripIcon} className="size-[18px]" />
      ) : (
        renderHandleContent(position)
      )}
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-90 shadow-hero" : ""}
    >
      {renderRow(item, handle)}
    </li>
  );
}

export default SortableList;
