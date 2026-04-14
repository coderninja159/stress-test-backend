const jwt = require('jsonwebtoken')

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      schoolId: user.school_id,
      studentId: user.student_id
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

const createOtpVerifiedToken = (phone) => {
  const secret = process.env.OTP_VERIFY_SECRET || process.env.JWT_SECRET
  return jwt.sign({ phone, otpVerified: true }, secret, { expiresIn: '15m' })
}

module.exports = { createToken, createOtpVerifiedToken }
