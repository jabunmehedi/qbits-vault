// src/store/index.js
import { configureStore } from "@reduxjs/toolkit";
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from "redux-persist";
import storage from "redux-persist/lib/storage"; // uses localStorage
import authReducer from "./authSlice";
import reconciliationReducer from "./checkReconcile";

// Persist config
const persistConfig = {
  key: "auth",
  version: 1,
  storage,
  whitelist: ["user", "roles", "permissions", "token", "isHydrated"],
};

const persistedReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedReducer,
    reconciliation: reconciliationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
