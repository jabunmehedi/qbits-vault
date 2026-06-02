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
    console.error(error?.response?.data?.message);
  }
};
