import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster, ToastBar } from "react-hot-toast";
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
              background: "rgba(24, 31, 44, 0.72)",
              color: "var(--color-text)",
              border: "1px solid rgba(96, 165, 250, 0.38)",
              boxShadow:
                "0 10px 28px rgba(8, 15, 30, 0.46), 0 0 0 1px rgba(96, 165, 250, 0.08) inset",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            },
            success: {
              style: {
                background: "rgba(5, 56, 41, 0.72)",
                border: "1px solid rgba(52, 211, 153, 0.45)",
                color: "#d1fae5",
                boxShadow:
                  "0 10px 28px rgba(3, 25, 18, 0.5), 0 0 0 1px rgba(52, 211, 153, 0.12) inset",
              },
              iconTheme: {
                primary: "#34d399",
                secondary: "#03120c",
              },
            },
            error: {
              style: {
                background: "rgba(79, 16, 26, 0.74)",
                border: "1px solid rgba(248, 113, 113, 0.5)",
                color: "#fee2e2",
                boxShadow:
                  "0 10px 28px rgba(38, 8, 13, 0.54), 0 0 0 1px rgba(248, 113, 113, 0.15) inset",
              },
              iconTheme: {
                primary: "#f87171",
                secondary: "#170404",
              },
            },
            loading: {
              style: {
                background: "rgba(24, 31, 44, 0.72)",
                border: "1px solid rgba(96, 165, 250, 0.42)",
                color: "#dbeafe",
                boxShadow:
                  "0 10px 28px rgba(8, 15, 30, 0.46), 0 0 0 1px rgba(96, 165, 250, 0.12) inset",
              },
            },
          }}
        >
          {(t) => (
            <ToastBar
              toast={t}
              style={{
                ...t.style,
                animation: t.visible
                  ? "toast-in-right 0.26s cubic-bezier(0.22, 1, 0.36, 1)"
                  : "toast-out-right 0.18s ease-in forwards",
              }}
            />
          )}
        </Toaster>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
