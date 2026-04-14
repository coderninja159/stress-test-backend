const rateLimit = require('express-rate-limit')
const { RateLimitError } = require('../utils/errors')

const logAuthLimit = (req) => {
  const ip = req.ip || req.socket?.remoteAddress || 'noma’lum'
  console.warn(`[XAVFSIZLIK] IP: ${ip} login limitiga yetdi`)
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logAuthLimit(req)
    next(new RateLimitError('Juda ko‘p kirish urinishi. 15 daqiqadan keyin qayta urinib ko‘ring.'))
  }
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new RateLimitError('Ro‘yxatdan o‘tish limiti: soatiga 10 marta.'))
  }
})

function smsLimiter(req, res, next) {
  const phone = req.body?.phone
  if (!phone) return next()
  const key = `sms:${phone}`
  const store = smsLimiter._store || (smsLimiter._store = new Map())
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  const max = 3
  const list = (store.get(key) || []).filter((t) => now - t < windowMs)
  if (list.length >= max) {
    return next(new RateLimitError('SMS limiti: telefon raqamiga soatiga 3 ta.'))
  }
  list.push(now)
  store.set(key, list)
  next()
}

const testLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res, next) => {
    next(new RateLimitError('Test yuborish limiti: soatiga 5 marta.'))
  }
})

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res, next) => {
    next(new RateLimitError('AI so‘rovlari limiti: daqiqada 20 marta.'))
  }
})

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new RateLimitError('Juda ko‘p so‘rov. Keyinroq urinib ko‘ring.'))
  }
})

module.exports = {
  authLimiter,
  registerLimiter,
  smsLimiter,
  testLimiter,
  aiLimiter,
  generalLimiter
}
