export const environment = {
  production: false,
  // API calls go through the Angular dev proxy (/api/v1 → http://localhost:5000)
  apiUrl: '/api/v1',
  // Media/upload assets served directly from the backend — bypass the proxy
  // to avoid 404 when the proxy is not active or not forwarding /uploads correctly
  mediaBaseUrl: 'http://localhost:5000',
  // Google Analytics 4 Measurement ID
  googleAnalyticsId: 'G-H064CBHPQ9',
};
