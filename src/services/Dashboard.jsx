import axiosConfig from "../utils/axiosConfig";

export const GetDashboardReports = async (timeframe, selectedVault) => {
  try {
    const response = await axiosConfig.get(`/dashboard/reports`, { params: { timeframe, selectedVault } });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
