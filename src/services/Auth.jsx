import axios from "../utils/axiosConfig";

export const SignIn = async (data) => {
  try {
    const response = await axios.post(`/login`, data);
    return response?.data;
  } catch (error) {
    return error?.response;
  }
};
export const Logout = async () => {
  try {
    const response = await axios.post(`/logout`);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};
export const EmailVerify = async (code) => {
  try {
    const response = await axios.post(`/email/verify`, code);
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};

export const SendPhoneOtp = async (phone) => {
  try {
    const response = await axios.post(`/phone/send-otp`, { phone });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};
export const PhoneVerify = async (otp, phone) => {
  try {
    const response = await axios.post(`/phone/verify`, { otp, phone });
    return response?.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    return error?.response?.data;
  }
};
