import axios from 'axios';

const request = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // FormData 上传时不要带 Content-Type，让浏览器自动设 multipart/form-data; boundary=...
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

request.interceptors.response.use(
  (res) => res,
  (err) => {
    // 管理员登录接口返回 401 表示密码错误，不清除 token
    const isAdminLogin = err.config?.url?.includes('/api/auth/admin');
    if (err.response && err.response.status === 401 && !isAdminLogin) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
    }
    return Promise.reject(err);
  }
);

export default request;
