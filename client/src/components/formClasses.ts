// The pieces the v3 forms repeat word for word (handoff du programme and
// handoff des blocs). They live here so one value changes in one place.

// A field label: 10 px, extra bold, uppercase, widely spaced, cyan. The
// font is named because a label may be a heading, and a heading is slanted
// by default.
export const FORM_LABEL =
  "font-sans text-[10px] font-extrabold uppercase not-italic leading-[1.2] tracking-[0.14em] text-accent";

// A field that is only read (a date, a day of the week): the look of an
// input, without being one.
export const FORM_BOX =
  "flex h-[46px] items-center gap-2.5 rounded-[12px] border border-base-300 bg-base-100 px-3 text-sm font-bold";

// The slanted title of a section inside a page: "BLOCS", "EXERCICES".
export const SECTION_TITLE =
  "font-display text-[22px] font-black uppercase not-italic leading-none [transform:skewX(-10deg)]";

// The same title, in the 24 px of a bottom sheet.
export const SHEET_TITLE =
  "font-display text-[24px] font-black uppercase not-italic leading-[0.9] [transform:skewX(-10deg)]";

// The count on the right of a section title: "1 bloc", "2 exercices".
export const SECTION_COUNT = "text-[11px] font-bold text-muted";

// The one orange button of a screen, stuck to its bottom. Disabled, it
// turns grey and loses its glow (handoff 2.3).
export const CTA =
  "flex h-[50px] w-full items-center justify-center gap-2.5 rounded-[12px] bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:bg-disabled disabled:text-disabled-text disabled:shadow-none";

// "Ajouter un bloc", "Ajouter un exercice": the dashed button.
export const DASHED_BUTTON =
  "flex h-[46px] items-center justify-center gap-2 rounded-[14px] border border-dashed border-dash text-sm font-bold text-secondary disabled:opacity-60";

// An empty state inside a form: a tinted square, then two grey lines.
export const EMPTY_CARD =
  "flex flex-col items-center gap-3.5 rounded-[16px] border border-empty-border bg-empty px-[30px] py-6 shadow-card";
export const EMPTY_ICON_BOX =
  "grid size-10 place-items-center rounded-[10px] bg-icon-box text-icon-stroke";
export const EMPTY_TEXT =
  "text-center text-[13px] font-medium leading-[1.5] text-empty-text";
