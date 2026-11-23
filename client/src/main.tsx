import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/saira-condensed/800.css";
import "./styles/global.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import App from "./App";
import HomePage from "./pages/HomePage";

const router = createBrowserRouter([
  {
    element: <App />,
    children: [{ path: "/", element: <HomePage /> }],
  },
]);

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("The #root element is missing in index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
