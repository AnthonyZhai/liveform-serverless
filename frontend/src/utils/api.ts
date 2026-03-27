// If VITE_API_BASE_URL is explicitly set, use it. Otherwise, if we are on localhost, use 8000. If on production (Vercel), use empty string for relative paths.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined 
  ? import.meta.env.VITE_API_BASE_URL 
  : (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1' ? "http://127.0.0.1:8000" : "");

export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers = {
    ...options.headers,
    ...getAuthHeaders(),
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Redirect to login if unauthorized
    window.location.href = "/login";
  }

  return response;
};
