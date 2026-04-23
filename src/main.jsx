import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Toaster } from "./components/global/toast/Toaster.jsx";
import { useToast } from "./hooks/useToast.js";
import { Provider } from "react-redux";
import { persistor, store } from "./store/index.jsx";
import PermissionInitializer from "./components/permission/PermissionInitializer.jsx";
import { PersistGate } from "redux-persist/integration/react";

// 1. Import React Query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// 2. Create the Query Client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // These settings help prevent unnecessary re-fetches
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
      refetchOnWindowFocus: false, // Don't reload every time you switch tabs
    },
  },
});

function Root() {
  const { toasts, removeToast } = useToast();

  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
          </div>
        }
        persistor={persistor}
      >
        {/* 3. Wrap everything inside the QueryClientProvider */}
        <QueryClientProvider client={queryClient}>
          <PermissionInitializer>
            <App />
            <Toaster toasts={toasts} removeToast={removeToast} />
          </PermissionInitializer>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
