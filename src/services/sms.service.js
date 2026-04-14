const axios = require('axios')
const { supabase } = require('../config/supabase')
const eskizConfig = require('../config/eskiz')

let cachedToken = null
let tokenExpiresAt = 0

async function getEskizToken() {
  const now = Date.now()
  if (cachedToken && tokenExpiresAt > now + 5000) return cachedToken

  const { data } = await axios.post(
    `${eskizConfig.baseUrl}/auth/login`,
    {
      email: eskizConfig.login,
      password: eskizConfig.password
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
  )

  const token = data?.data?.token || data?.token
  if (!token) throw new Error('Eskiz token olinmadi')
  cachedToken = token
  tokenExpiresAt = now + 23 * 60 * 60 * 1000
  return token
}

async function sendSms(phone, message) {
  const token = await getEskizToken()
  await axios.post(
    `${eskizConfig.baseUrl}/message/sms/send`,
    {
      mobile_phone: phone,
      message,
      from: eskizConfig.from
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  )
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function saveOtp(phone, code) {
  const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  const { error } = await supabase.from('otp_codes').insert({
    phone,
    code,
    expires_at,
    used: false
  })
  if (error) throw error
}

async function verifyOtp(phone, code) {
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('otp_codes')
    .select('id')
    .eq('phone', phone)
    .eq('code', code)
    .eq('used', false)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return false

  await supabase.from('otp_codes').update({ used: true }).eq('id', data.id)
  return true
}

module.exports = {
  sendSms,
  generateOtp,
  saveOtp,
  verifyOtp
}
