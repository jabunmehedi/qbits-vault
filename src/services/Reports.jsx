import axiosConfig from "../utils/axiosConfig";

export const GetReports = async (params = {}) => {
  try {
    const response = await axiosConfig.get(`/reports`, { params });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
