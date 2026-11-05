/* this is used as a base class for all API based services */
import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import axios, {
  AxiosError,
  HttpStatusCode,
  type AxiosResponse,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

const axiosApiInstance: AxiosInstance = axios.create({
  baseURL: '/',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

axiosApiInstance.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: unknown) => {
    if (error instanceof AxiosError && error.response?.status === HttpStatusCode.Unauthorized) {
      window.location.href = `/api/auth/login?redirectUrl=${location.href}`;
    }
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    return Promise.reject(error);
  },
);

axiosApiInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const authStore: AuthStore = useAuthStore();
  if (authStore.csrfToken) {
    config.headers['X-CSRF-Token'] = authStore.csrfToken;
  }
  return config;
});

export default axiosApiInstance;
