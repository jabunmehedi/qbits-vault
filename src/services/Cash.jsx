import axios from "../utils/axiosConfig";

export const GetCashIns = async () => {
  try {
    const response = await axios.get(`/cash-in`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const GetCashIn = async (id) => {
  try {
    const response = await axios.get(`/cash-in/${id}`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const GetCashOuts = async () => {
  try {
    const response = await axios.get(`/cash-out`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const CreateCashIn = async (data) => {
  try {
    const response = await axios.post(`/cash-in`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error;
  }
};
export const UpdateCashIn = async (id, data) => {
  try {
    const response = await axios.put(`/cash-in/${id}`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error;
  }
};
export const DeleteCashIn = async (id) => {
  try {
    const response = await axios.delete(`/cash-in/${id}`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error;
  }
};
export const CreateCashOut = async (data) => {
  try {
    const response = await axios.post(`/cash-out`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};

export const GetPendingCashIn = async () => {
  try {
    const response = await axios.get(`/pending/cash-in`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const GetPendingCashOut = async () => {
  try {
    const response = await axios.get(`/pending/cash-out`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const VerifyCashIn = async (id, action, note = "") => {
  try {
    const response = await axios.post(`/verify/cash-in/${id}`, { action, note });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const VerifyCashOut = async (id, action, note = "") => {
  try {
    const response = await axios.post(`/verify/cash-out/${id}`, { action, note });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const ApproveCashIn = async (id, note = "") => {
  try {
    const response = await axios.post(`/approve/cash-in/${id}`, { note });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const ApproveCashOut = async (id, note = "") => {
  try {
    const response = await axios.post(`/approve/cash-out/${id}`, { note });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
