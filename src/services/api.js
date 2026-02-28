import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'https://imacampus.lk/api'; 
export const IMAGE_URL = 'https://imacampus.lk/storage/'; 

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request ekak yaddi auto token eka attach kirima
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const fetchHomeData = async () => {
  const response = await api.get('/init'); 
  return response.data; 
};

export const loginUser = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
};

export default api;