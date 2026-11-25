// A grey card of the same height as a real one, while the list loads.
function ExerciseCardSkeleton() {
  return (
    <li
      aria-hidden="true"
      className="flex min-h-24 items-center gap-3 rounded-card border border-base-300 bg-base-100 p-3"
    >
      <span className="size-18 shrink-0 animate-pulse rounded-ctl bg-soft motion-reduce:animate-none" />
      <span className="flex flex-1 flex-col gap-2">
        <span className="h-4 w-2/3 animate-pulse rounded-chip bg-soft motion-reduce:animate-none" />
        <span className="h-3 w-1/2 animate-pulse rounded-chip bg-soft motion-reduce:animate-none" />
        <span className="h-3 w-1/3 animate-pulse rounded-chip bg-soft motion-reduce:animate-none" />
      </span>
    </li>
  );
}

export default ExerciseCardSkeleton;
