type Record = {
  // "Charge max"
  label: string;
  // "62,5 kg"
  value: string;
  // "× 8 · 19 nov."
  detail?: string | null;
};

type Props = {
  records: Record[];
};

// Screens SUI-09 to SUI-11: the blocks of records, two by two, under the
// curve. Everything is computed from the sets done (RM-051).
function RecordGrid({ records }: Props) {
  if (records.length === 0) {
    return null;
  }
  return (
    <ul aria-label="Records" className="grid grid-cols-2 gap-2.5">
      {records.map((record) => (
        <li
          key={record.label}
          className="flex flex-col gap-1 rounded-card border border-base-300 bg-base-100 p-3.5 shadow-card"
        >
          <span className="font-sans text-overline uppercase not-italic text-accent">
            {record.label}
          </span>
          <b className="font-display text-display-xs uppercase italic">
            {record.value}
          </b>
          {record.detail !== null && record.detail !== undefined && (
            <span className="text-xs leading-[1.45] text-muted">
              {record.detail}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default RecordGrid;
