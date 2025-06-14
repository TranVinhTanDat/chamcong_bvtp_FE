import axios from 'axios';
import DIA_CHI_API from './URL_BASE_API';

const axiosInstance = axios.create({
  baseURL: DIA_CHI_API,
});

axiosInstance.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export default axiosInstance;