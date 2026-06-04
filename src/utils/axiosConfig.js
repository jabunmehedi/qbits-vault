import axios from "axios";
import { store } from "../store";
import { logout } from "../store/authSlice";

const axiosConfig = axios.create({
  baseURL: import.meta.env.VITE_REACT_APP_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

axiosConfig.interceptors.request.use(
  (config) => {
    if (!navigator.onLine) {
      const err = new Error("No internet connection");
      err.isOffline = true;
      return Promise.reject(err);
    }

    const access_token = localStorage.getItem("access_token");
    if (access_token) {
      try {
        // const { access_token } = JSON.parse(auth);
        if (access_token) {
          config.headers.Authorization = `Bearer ${access_token}`;
        }
      } catch {
        localStorage.removeItem("auth");
      }
    }

    return config;
  },
  (err) => Promise.reject(err),
);

axiosConfig.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const errorCode = error.response?.data?.error_code;

    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    if (status === 403 && errorCode === "ACCOUNT_INACTIVE") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth");
      store.dispatch(logout());
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login?reason=inactive";
      }
    }

    return Promise.reject(error);
  },
);

export default axiosConfig;
