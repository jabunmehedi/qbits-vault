import axiosConfig from "../utils/axiosConfig";

export const GetReconciles = async (params = {}) => {
  try {
    const response = await axiosConfig.get(`/reconciles`, { params });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const UpdateReconcile = async (reconclieId, data) => {
  try {
    const response = await axiosConfig.put(`/reconciles/${reconclieId}`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const GetLatestReconcile = async () => {
  try {
    const response = await axiosConfig.get(`/reconcile/latest`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const StartReconcile = async (data) => {
  try {
    const response = await axiosConfig.post(`/reconcile`, data);
    return response?.data;
  } catch (error) {
    return error?.response?.data;
  }
};

export const GetPendingReconciliations = async () => {
  try {
    const response = await axiosConfig.get(`/pending/reconciles`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};

export const VerifyReconcile = async (id, action = "verify", note = "") => {
  try {
    const response = await axiosConfig.post(`/reconcile/verify/${id}`, { action, note });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};

export const RejectReconcile = async (id, note = "", type = "verifier") => {
  try {
    const response = await axiosConfig.post(`/reconcile/reject/${id}`, { note, type });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};

export const ApproveReconcile = async (id, note = "") => {
  try {
    const response = await axiosConfig.post(`/reconcile/approve/${id}`, { note });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};

export const StartReconciliation = async (id) => {
  try {
    const response = await axiosConfig.post(`/reconcile/start/${id}`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const EndReconciliation = async (id) => {
  try {
    const response = await axiosConfig.post(`/reconcile/end/${id}`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const CompleteReconciliation = async (id, data) => {
  try {
    const response = await axiosConfig.put(`/reconciliation/save/${id}`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data || { success: false };
  }
};
export const CheckReconcile = async (vaultId) => {
  try {
    const response = await axiosConfig.get(`/reconciliation/check/${vaultId}`);
    return response;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const ViewReconcile = async (reconclieId) => {
  try {
    const response = await axiosConfig.get(`/reconciles/${reconclieId}`);
    return response;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
