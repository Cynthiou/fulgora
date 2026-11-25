import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/saira-condensed/800.css";
import "./styles/global.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import App from "./App";
import AppLayout from "./components/AppLayout";
import PageLayout from "./components/PageLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import PlanningPage from "./features/appointment/pages/PlanningPage";
import ExerciseDetailPage from "./features/exercise/pages/ExerciseDetailPage";
import ExerciseListPage from "./features/exercise/pages/ExerciseListPage";
import TrackingPage from "./features/history/pages/TrackingPage";
import SessionEditorPage from "./features/session-template/pages/SessionEditorPage";
import LoginPage from "./features/user/pages/LoginPage";
import ProfilePage from "./features/user/pages/ProfilePage";
import SignupPage from "./features/user/pages/SignupPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      // Public pages, without the tabs
      {
        element: <PageLayout />,
        children: [
          { path: "/inscription", element: <SignupPage /> },
          { path: "/connexion", element: <LoginPage /> },
        ],
      },
      // Private pages: never shown without a connected user
      {
        element: <ProtectedRoute />,
        children: [
          // The four tabs
          {
            element: <AppLayout />,
            children: [
              { path: "/", element: <HomePage /> },
              { path: "/planning", element: <PlanningPage /> },
              { path: "/suivi", element: <TrackingPage /> },
              { path: "/catalogue", element: <ExerciseListPage /> },
            ],
          },
          // Full pages without the tabs: the profile (from the avatar) and
          // the exercise detail (its own header and bottom button)
          {
            element: <PageLayout />,
            children: [
              { path: "/profil", element: <ProfilePage /> },
              { path: "/catalogue/:id", element: <ExerciseDetailPage /> },
              { path: "/seances/nouvelle", element: <SessionEditorPage /> },
            ],
          },
        ],
      },
      // Unknown address
      {
        element: <PageLayout />,
        children: [{ path: "*", element: <NotFoundPage /> }],
      },
    ],
  },
]);

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("The #root element is missing in index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
