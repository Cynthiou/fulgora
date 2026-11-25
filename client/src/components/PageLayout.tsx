import { Outlet } from "react-router";

// The shell of the pages without tabs: signup, login, profile, not found.
// One <main> landmark per page, for screen readers.
function PageLayout() {
  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <Outlet />
    </main>
  );
}

export default PageLayout;
