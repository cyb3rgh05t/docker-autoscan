import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          gutter={10}
          containerStyle={{ top: 18, right: 18 }}
          toastOptions={{
            className: "autoscan-toast",
            duration: 4000,
            style: {
              background: "rgba(10, 10, 10, 0.92)",
              color: "var(--color-text)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            },
            success: {
              iconTheme: {
                primary: "#34d399",
                secondary: "#03120c",
              },
            },
            error: {
              iconTheme: {
                primary: "#f87171",
                secondary: "#170404",
              },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
