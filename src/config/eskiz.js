module.exports = {
  baseUrl: process.env.ESKIZ_BASE_URL || 'https://notify.eskiz.uz/api',
  login: process.env.ESKIZ_LOGIN,
  password: process.env.ESKIZ_PASSWORD,
  from: process.env.ESKIZ_FROM || 'StressTest'
}
