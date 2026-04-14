const smsService = require('../services/sms.service')
const { createOtpVerifiedToken } = require('../services/auth.service')
const { ValidationError } = require('../utils/errors')

const phoneRegex = /^\+998[0-9]{9}$/

async function sendOtp(req, res, next) {
  try {
    const { phone } = req.body
    if (!phone || !phoneRegex.test(phone)) {
      return next(new ValidationError('Telefon +998XXXXXXXXX formatida bo‘lishi kerak'))
    }

    const code = smsService.generateOtp()
    await smsService.saveOtp(phone, code)
    await smsService.sendSms(phone, `StressTest tasdiqlash kodi: ${code}`)

    res.json({ success: true, message: 'SMS yuborildi' })
  } catch (e) {
    next(e)
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { phone, code } = req.body
    if (!phone || !phoneRegex.test(phone)) {
      return next(new ValidationError('Telefon +998XXXXXXXXX formatida bo‘lishi kerak'))
    }
    if (!code) return next(new ValidationError('code kerak'))

    const ok = await smsService.verifyOtp(phone, String(code))
    if (!ok) {
      return res.status(400).json({ success: false, message: 'Kod noto‘g‘ri yoki muddati o‘tgan' })
    }

    const verified_token = createOtpVerifiedToken(phone)
    res.json({ success: true, verified_token })
  } catch (e) {
    next(e)
  }
}

module.exports = { sendOtp, verifyOtp }
