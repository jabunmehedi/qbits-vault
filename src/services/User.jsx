import axios from "../utils/axiosConfig";

export const GetUsers = async () => {
  try {
    const response = await axios.get(`/users`);
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
export const ChangePassword = async (id, data) => {
  try {
    const response = await axios.post(`/users/${id}/password`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
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
