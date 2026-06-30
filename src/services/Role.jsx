import axios from "../utils/axiosConfig";

export const CreateRole = async (data) => {
  try {
    const response = await axios.post(`/roles`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
export const UpdateRole = async (id, data) => {
  try {
    const response = await axios.put(`/roles/${id}`, data);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
export const DeleteRole = async (id) => {
  try {
    const response = await axios.delete(`/roles/${id}`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response;
  }
};
