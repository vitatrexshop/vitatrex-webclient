export const environment = {
  production: false,
  // In dev, the proxy handles /api/v1 → http://localhost:5000
  // Leave apiUrl as empty string so all HTTP calls use relative paths
  apiUrl: '',
};
