import { Outlet } from "react-router";

// The shell shared by every page. The current page is displayed in <Outlet />.
function App() {
  return (
    <main className="min-h-screen bg-base-100 text-base-content">
      <Outlet />
    </main>
  );
}

export default App;
