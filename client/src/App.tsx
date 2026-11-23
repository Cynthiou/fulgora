import { Outlet } from "react-router";

// The shell shared by every page. The current page is displayed in <Outlet />.
function App() {
  return (
    <main>
      <Outlet />
    </main>
  );
}

export default App;
