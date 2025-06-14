import axios from 'axios';
import DIA_CHI_API from './URL_BASE_API';

const axiosInstance = axios.create({
  baseURL: DIA_CHI_API, // Use environment variable
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Request Headers:', config.headers); // Log headers for debugging
    } else {
      console.warn('No JWT token found in localStorage');
    }
    return config;
  },
  (error) => {
    console.error('Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Response Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('Unauthorized - Redirecting to login');
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
      window.location.href = '/dang-nhap';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;