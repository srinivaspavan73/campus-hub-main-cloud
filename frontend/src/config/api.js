// API Configuration for CampusHub
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' 
    ? 'https://campus-hub-main-cloud.onrender.com'
    : 'http://localhost:5000');

console.log('🔗 API Base URL:', API_BASE_URL);
console.log('🌍 Environment:', import.meta.env.MODE);

export default API_BASE_URL;