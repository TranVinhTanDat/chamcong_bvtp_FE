
// URL_BASE_API.js
const DIA_CHI_API = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// Log để debug (chỉ trong development)
if (process.env.NODE_ENV === 'development') {
    console.log('🔌 API Base URL:', DIA_CHI_API);
    console.log('🌍 Environment:', process.env.NODE_ENV);
}

export default DIA_CHI_API;