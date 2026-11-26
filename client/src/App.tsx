import { Outlet } from "react-router";
import OfflineScreen from "./components/OfflineScreen";
import { useOnline } from "./hooks/useOnline";

// The root of every page. The layouts (AppLayout with the tabs, PageLayout
// without) each bring their own <main>, so nothing is drawn here. Without
// a network, the whole app is replaced by the offline screen (US-45).
function App() {
  const isOnline = useOnline();

  return isOnline ? <Outlet /> : <OfflineScreen />;
}

export default App;
