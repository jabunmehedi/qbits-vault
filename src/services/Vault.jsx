import axiosConfig from "../utils/axiosConfig";

export const GetVaults = async (params = {}) => {
  try {
    const response = await axiosConfig.get(`/vault`, { params });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const GetVault = async (vaultId) => {
  try {
    const response = await axiosConfig.get(`/vault/${vaultId}`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const UpdateVault = async (vaultId, data) => {
  try {
    const response = await axiosConfig.put(`/vault/${vaultId}`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const DeleteVault = async (vaultId) => {
  try {
    const response = await axiosConfig.delete(`/vault/${vaultId}`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};
export const GetVaultBagById = async (vaultId) => {
  try {
    const response = await axiosConfig.get(`/vault/bag/${vaultId}`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const GetBagByBagId = async (bagId) => {
  try {
    const response = await axiosConfig.get(`/bag/${bagId}`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const CreateVault = async (data) => {
  try {
    const response = await axiosConfig.post(`/vault`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};
export const AddBagToVault = async (vaultId, data) => {
  try {
    const response = await axiosConfig.post(`/vault/${vaultId}/bag`, data);
    return response?.data;
  } catch (error) {
    return error?.response?.data;
  }
};

export const BagCreateRequest = async (data) => {
  try {
    const response = await axiosConfig.post(`/bag/create-request`, data);
    return response?.data;
  } catch (error) {
    return error?.response?.data;
  }
};

export const ToggleVaultAccess = async (userId, vaultId) => {
  try {
    const response = await axiosConfig.post(`/users/${userId}/vaults/toggle`, { vault_id: vaultId });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const UpdateVaultRoles = async (userId, vaultId, roles) => {
  try {
    const response = await axiosConfig.put(`/users/${userId}/vaults/${vaultId}/roles`, { roles });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
export const GetBagHistory = async (bagId) => {
  try {
    const response = await axiosConfig.get(`/activity-logs/bag/${bagId}`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};
export const MakeDefaultVault = async (id, data) => {
  try {
    const response = await axiosConfig.put(`/users/${id}`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
  }
};
