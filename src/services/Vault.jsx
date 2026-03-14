import axiosConfig from "../utils/axiosConfig";

export const GetVaults = async () => {
  try {
    const response = await axiosConfig.get(`/vault`);
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
  }
};
