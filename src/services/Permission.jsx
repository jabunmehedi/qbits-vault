import axios from "../utils/axiosConfig";

export const UpdatePermissions = async (userId, permissions) => {
  try {
    const response = await axios.put(`/users/${userId}/update-permissions`, { permissions });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};