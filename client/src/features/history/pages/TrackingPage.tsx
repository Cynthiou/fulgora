import EmptyState from "../../../components/EmptyState";

// The Suivi tab. The history list arrives with US-35: until then the empty
// screen SUI-07, so the tab leads somewhere.
function TrackingPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-4">
      <h1 className="text-display-md">Suivi</h1>
      <EmptyState
        title="Aucune séance passée"
        message="Tes séances apparaîtront ici dès qu'elles seront faites, manquées ou annulées."
      />
    </div>
  );
}

export default TrackingPage;
