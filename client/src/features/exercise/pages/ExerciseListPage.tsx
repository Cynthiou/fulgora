import EmptyState from "../../../components/EmptyState";

// The Catalogue tab. The exercise list arrives with US-07: until then a
// waiting screen, so the tab leads somewhere.
function ExerciseListPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-4">
      <h1 className="text-display-md">Catalogue</h1>
      <EmptyState
        title="Catalogue en préparation"
        message="Les 151 exercices illustrés arrivent dans la prochaine version."
      />
    </div>
  );
}

export default ExerciseListPage;
