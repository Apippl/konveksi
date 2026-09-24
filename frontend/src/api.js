import axios from "axios";

const baseURL = import.meta.env?.VITE_API_BASE_URL || "http://127.0.0.1:8000";
if (!import.meta.env?.VITE_API_BASE_URL && import.meta.env?.PROD) {
  // Jangan throw di sini — throw saat import = blank putih total.
  // Cukup warn, app tetap jalan dengan fallback di atas.
  console.warn("VITE_API_BASE_URL belum diset untuk production build, pakai fallback:", baseURL);
}

const api = axios.create({
  baseURL,
});

// Interceptor Request: Tempelkan token JWT jika ada
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor Response: Tangani error 401 (Token Expired / Invalid) secara otomatis
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;