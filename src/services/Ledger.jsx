import axiosConfig from "../utils/axiosConfig";

export const GetCashInLedger = async (cashInId) => {
  try {
    const response = await axiosConfig.get(`/cash-in/${cashInId}/ledger`);
    return response.data;
  } catch (error) {
    console.error("Error fetching cash-in ledger:", error);
    throw error;
  }
};
