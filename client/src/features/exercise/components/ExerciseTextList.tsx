type Props = {
  title: string;
  items: string[];
  // Instructions are numbered steps; mistakes and alternatives are not.
  ordered?: boolean;
  // Written before each unordered item, for example "×" for the mistakes.
  marker?: string;
};

// Screens 05-1 and 05-3b: one text section of the detail, in its white card
// with a teal overline. The steps carry a dark numbered square, the other
// lists a small dot, and a thin rule separates the lines. Hidden when there
// is nothing to say (a personal exercise without alternatives).
function ExerciseTextList({ title, items, ordered = false, marker }: Props) {
  if (items.length === 0) {
    return null;
  }

  const id = `section-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  const List = ordered ? "ol" : "ul";

  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
    >
      <h2
        id={id}
        className="font-sans text-overline uppercase not-italic text-accent"
      >
        {title}
      </h2>
      <List className="flex flex-col">
        {items.map((item, index) => (
          <li
            key={item}
            className={`flex items-start gap-2.5 py-1 ${
              index === 0 ? "" : "mt-1.5 border-t border-base-300 pt-2.5"
            }`}
          >
            {ordered ? (
              <span
                aria-hidden="true"
                className="mt-px grid size-6 shrink-0 place-items-center rounded-ctl bg-neutral text-xs font-extrabold text-neutral-content"
              >
                {index + 1}
              </span>
            ) : (
              <span
                aria-hidden="true"
                className={`mt-[7px] shrink-0 ${
                  marker === undefined
                    ? "size-1.5 rounded-full bg-secondary"
                    : "font-bold text-status-missed"
                }`}
              >
                {marker}
              </span>
            )}
            <span className="text-sm font-medium leading-[1.45]">{item}</span>
          </li>
        ))}
      </List>
    </section>
  );
}

export default ExerciseTextList;
