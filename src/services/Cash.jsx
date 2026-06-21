import axios from "../utils/axiosConfig";

export const GetCashIns = async (params = {}) => {
  try {
    const response = await axios.get(`/cash-in`, { params });
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
export const GetCashOuts = async (params = {}) => {
  try {
    const response = await axios.get(`/cash-out`, { params });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const CheckBagAvailability = async (vaultId) => {
  try {
    const response = await axios.get(`/check-bag/cash-in/${vaultId}`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error;
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
export const UpdateCashOut = async (id, data) => {
  try {
    const response = await axios.put(`/cash-out/${id}`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};

// cashout

export const GetPendingCashIn = async () => {
  try {
    const response = await axios.get(`/pending/cash-in`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};

export const VerifyCashIn = async (id, action = "verify", note = "") => {
  try {
    const response = await axios.post(`/verify/cash-in/${id}`, { action: action, note });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);

    return error?.response?.data;
  }
};

export const ApproveCashIn = async (id, note = "") => {
  try {
    const response = await axios.post(`/approve/cash-in/${id}`, { note });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};

export const RejectCashIn = async (id, note = "", type = "verifier") => {
  try {
    const response = await axios.post(`/reject/cash-in/${id}`, { note, type });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};

export const GetCashInsByVaultId = async (id, params = {}) => {
  try {
    const response = await axios.get(`/cash-ins/${id}`, { params });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};

// cash out

export const GetCashOut = async (id) => {
  try {
    const response = await axios.get(`/cash-out/${id}`);
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
export const VerifyCashOut = async (id, action, note = "") => {
  try {
    const response = await axios.post(`/verify/cash-out/${id}`, { action, note });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};

export const ApproveCashOut = async (id, note = "") => {
  try {
    const response = await axios.post(`/approve/cash-out/${id}`, { note });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};

export const RejectCashOut = async (id, note = "", type = "verifier") => {
  try {
    const response = await axios.post(`/reject/cash-out/${id}`, { note, type });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};

export const DeleteCashOut = async (id) => {
  try {
    const response = await axios.delete(`/cash-out/${id}`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error;
  }
};

export const CustodianVerifyCashReceived = async (id) => {
  try {
    const response = await axios.post(`/custodian/verify/${id}`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};

export const CustodianRejectCashReceived = async (id, note = '') => {
  try {
    const response = await axios.post(`/custodian/reject/${id}`, { note });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};
