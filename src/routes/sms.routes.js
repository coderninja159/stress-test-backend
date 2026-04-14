const express = require('express')
const { body } = require('express-validator')
const smsController = require('../controllers/sms.controller')
const { handleValidationErrors } = require('../middleware/validate')
const { smsLimiter, generalLimiter } = require('../middleware/rateLimit')

const router = express.Router()

router.post(
  '/send-otp',
  smsLimiter,
  body('phone').notEmpty(),
  handleValidationErrors,
  smsController.sendOtp
)

router.post(
  '/verify-otp',
  generalLimiter,
  body('phone').notEmpty(),
  body('code').notEmpty(),
  handleValidationErrors,
  smsController.verifyOtp
)

module.exports = router
