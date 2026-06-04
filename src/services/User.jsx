import axios from "../utils/axiosConfig";

export const CreateUser = async (data) => {
  try {
    const response = await axios.post(`/users`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
export const GetUsers = async (params = {}) => {
  try {
    const response = await axios.get(`/users`, { params });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
export const GetUser = async (id) => {
  try {
    const response = await axios.get(`/users/${id}`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
export const UpdateUser = async (id, data) => {
  try {
    const response = await axios.put(`/users/${id}`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
export const ChangePassword = async (id, data) => {
  try {
    const response = await axios.post(`/users/${id}/password`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
export const UserNewPassword = async (id, data) => {
  try {
    const response = await axios.post(`/users/new-password/${id}`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};
export const GetRoles = async () => {
  try {
    const response = await axios.get(`/roles?exclude=permissions`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
export const GetCustodiansByVaultId = async (vaultId) => {
  try {
    const response = await axios.get(`/users/custodian/${vaultId}`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
export const DisableUser = async (userId) => {
  try {
    const response = await axios.put(`/users/${userId}/toggle-status`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
export const ArchiveUser = async (userId) => {
  try {
    const response = await axios.put(`/users/${userId}/archive`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
export const UserVerification = async (data) => {
  try {
    const response = await axios.post(`/user/verification`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
export const ResetUserPassword = async (userId) => {
  try {
    const response = await axios.post(`/users/${userId}/reset-password`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
export const ForgetPassword = async (email) => {
  try {
    const response = await axios.post(`/forget-password`, { email });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
export const ConfirmResetPassword = async (payload) => {
  try {
    const response = await axios.post(`/reset-password/confirm`, payload);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
export const UserArchiveCheck = async (userId) => {
  try {
    const response = await axios.get(`/users/${userId}/archive-check`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
