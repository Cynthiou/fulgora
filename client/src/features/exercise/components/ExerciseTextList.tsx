type Props = {
  title: string;
  items: string[];
  // Instructions are numbered steps; mistakes and alternatives are not.
  ordered?: boolean;
  // Written before each unordered item, for example "×" for the mistakes.
  marker?: string;
};

// Screen 05: one text section of the detail. Hidden when there is nothing
// to say (a personal exercise without alternatives).
function ExerciseTextList({ title, items, ordered = false, marker }: Props) {
  if (items.length === 0) {
    return null;
  }

  const id = `section-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;

  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-display-sm">
        {title}
      </h2>
      {ordered ? (
        <ol className="flex list-decimal flex-col gap-2 pl-6">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              {marker !== undefined && (
                <span
                  aria-hidden="true"
                  className="font-bold text-status-missed"
                >
                  {marker}
                </span>
              )}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ExerciseTextList;
