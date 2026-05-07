import axios from "../utils/axiosConfig";

export const GetOrders = async (params = {}) => {
  try {
    const response = await axios.get(`/get-all-orders`, { params });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const GetOrderHistory = async (id) => {
  try {
    const response = await axios.get(`/get/order/${id}/payment/history`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
