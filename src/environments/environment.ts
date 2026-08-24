export const environment = {
  production: false,
  // Dev: الـ proxy (proxy.conf.json) يتكفل بتوجيه /api/v1 و /uploads → http://localhost:5000
  // لذلك نتركهما فارغَين هنا ليستخدم Angular الـ proxy تلقائياً
  apiUrl: '',
  mediaBaseUrl: '',
};
