import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { CheckReconcile } from "../services/Reconcile";

const LOCK_STATUS_TTL_MS = 60 * 1000;

// 1. Accept vaultId as an argument for the Thunk payload
export const fetchReconciliationStatus = createAsyncThunk(
  "reconciliation/fetchStatus", 
  async (vaultId, { rejectWithValue }) => {
    if (!vaultId || vaultId === "undefined") {
      return rejectWithValue("Skipped request: Vault ID is undefined.");
    }

    try {
      // Passes down a guaranteed valid vault configuration ID instance
      const response = await CheckReconcile(vaultId);
      return { data: response.data, vaultId };
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Failed to fetch status");
    }
  },
  {
    condition: (vaultId, { getState }) => {
      if (!vaultId || vaultId === "undefined") return false;

      const state = getState().reconciliation;
      const key = String(vaultId);

      if (state.loadingByVault?.[key]) return false;

      const checkedAt = state.checkedAtByVault?.[key] || 0;
      return Date.now() - checkedAt > LOCK_STATUS_TTL_MS;
    },
  }
);

const reconciliationSlice = createSlice({
  name: "reconciliation",
  initialState: {
    vaultLocks: {}, // Changed from a single boolean to an object map (e.g., { "5": true, "12": false })
    loadingByVault: {},
    checkedAtByVault: {},
    status: "pending",
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReconciliationStatus.pending, (state, action) => {
        const vaultId = action.meta.arg;
        state.loading = true;
        state.error = null;
        if (vaultId) {
          state.loadingByVault[String(vaultId)] = true;
        }
      })
      .addCase(fetchReconciliationStatus.fulfilled, (state, action) => {
        state.loading = false;

        const { data, vaultId } = action.payload;
        const actualData = data?.data || data;

        if (vaultId) {
          // Store the specific lock status using the vaultId as the key
          const key = String(vaultId);
          state.vaultLocks[key] = actualData?.is_locked === true;
          state.checkedAtByVault[key] = Date.now();
          state.loadingByVault[key] = false;
        }
        
        state.status = actualData?.status || "none";
      })
      .addCase(fetchReconciliationStatus.rejected, (state, action) => {
        const vaultId = action.meta.arg;
        state.loading = false;
        state.error = action.payload || action.error.message;
        if (vaultId) {
          state.loadingByVault[String(vaultId)] = false;
        }
      });
  },
});

// 3. Update Selector to look up the specific vaultId dynamically
export const selectIsLockedForOperations = (state, vaultId) => {
  if (!vaultId) return false;
  return state.reconciliation.vaultLocks[vaultId] || false;
};

export default reconciliationSlice.reducer;
