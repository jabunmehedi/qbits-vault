import axios from "../utils/axiosConfig";

export const GetVaultAuditConfig = async (params = {}) => {
  try {
    const response = await axios.get(`/vault-audit-config`, { params });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const UpdateVaultAuditConfig = async (data, id) => {
  try {
    const response = await axios.put(`/vault-audit-config/${id}`, data);
    return response?.data;
  } catch (error) {
    throw error;
  }
};

export const ToggleVaultAuditCron = async (id) => {
  try {
    const response = await axios.patch(`/vault-audit-config/${id}/toggle-cron`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    throw error;
  }
};
