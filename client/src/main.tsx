import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/saira-condensed/800.css";
import "./styles/global.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import LoginPage from "./features/user/pages/LoginPage";
import SignupPage from "./features/user/pages/SignupPage";
import HomePage from "./pages/HomePage";

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: "/", element: <HomePage /> },
      // Public pages
      { path: "/inscription", element: <SignupPage /> },
      { path: "/connexion", element: <LoginPage /> },
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
