import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { CheckReconcile } from "../services/Reconcile";

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
  }
);

const reconciliationSlice = createSlice({
  name: "reconciliation",
  initialState: {
    vaultLocks: {}, // Changed from a single boolean to an object map (e.g., { "5": true, "12": false })
    status: "pending",
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReconciliationStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReconciliationStatus.fulfilled, (state, action) => {
        state.loading = false;

        const { data, vaultId } = action.payload;
        const actualData = data?.data || data;

        if (vaultId) {
          // Store the specific lock status using the vaultId as the key
          state.vaultLocks[vaultId] = actualData?.is_locked === true;
        }
        
        state.status = actualData?.status || "none";
      })
      .addCase(fetchReconciliationStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

// 3. Update Selector to look up the specific vaultId dynamically
export const selectIsLockedForOperations = (state, vaultId) => {
  if (!vaultId) return false;
  return state.reconciliation.vaultLocks[vaultId] || false;
};

export default reconciliationSlice.reducer;