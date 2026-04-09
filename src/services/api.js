import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'http://72.62.249.211:5000/api/mobile'; 
export const IMAGE_URL = 'http://72.62.249.211:5000/storage/';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request එකක් යද්දි Auto Token එක Attach කිරීම
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

// --- API FUNCTIONS ---

// 1. Home Data ගන්න (Courses/Notices)
export const fetchHomeData = async () => {
  const response = await api.get('/home'); // 🔥 FIX: '/init' වෙනුවට අලුත් backend එකේ '/home' දාන්න
  return response.data; 
};

// 2. Login කිරීම
export const loginUser = async (username, password) => {
  // 🔥 FIX: Backend එකට 'phone' විදිහට යවනවා
  const response = await api.post('/auth/login', { phone: username, password });
  return response.data;
};

// 3. User Profile
export const getUserProfile = async () => {
  const response = await api.get('/profile'); 
  return response.data;
};

export default api;