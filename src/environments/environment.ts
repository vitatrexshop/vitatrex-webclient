export const environment = {
  production: false,
  // API calls go through the Angular dev proxy (/api/v1 → http://localhost:5000)
  apiUrl: '',
  // Media/upload assets served directly from the backend — bypass the proxy
  // to avoid 404 when the proxy is not active or not forwarding /uploads correctly
  mediaBaseUrl: 'http://localhost:5000',
};
