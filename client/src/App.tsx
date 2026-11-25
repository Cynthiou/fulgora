import { Outlet } from "react-router";

// The root of every page. The layouts (AppLayout with the tabs, PageLayout
// without) each bring their own <main>, so nothing is drawn here.
function App() {
  return <Outlet />;
}

export default App;
