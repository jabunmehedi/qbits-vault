import axiosConfig from "../utils/axiosConfig";

export const GetReports = async (params = {}) => {
  try {
    const response = await axiosConfig.get(`/reports`, { params });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};

// Bank-statement view for a single vault. The API computes opening/closing
// balances and the per-row running balance server-side, and returns cursor-paginated
// transactions (newest first) for infinite scroll. Pass the previous response's
// `next_cursor` to load the next (older) page.
export const GetVaultStatement = async (vaultId, params = {}) => {
  try {
    const response = await axiosConfig.get(`/reports/vault/${vaultId}/statement`, { params });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    throw error;
  }
};
