const express = require('express')
const { body } = require('express-validator')
const authController = require('../controllers/auth.controller')
const { verifyToken } = require('../middleware/auth')
const { handleValidationErrors } = require('../middleware/validate')
const { authLimiter, registerLimiter, generalLimiter } = require('../middleware/rateLimit')

const router = express.Router()

const phoneRegex = /^\+998[0-9]{9}$/

router.post('/admin/login', authLimiter, authController.adminLogin)

router.post('/psychologist/login', authLimiter, authController.psychologistLogin)

router.post(
  '/student/verify-school',
  generalLimiter,
  body('schoolCode').notEmpty().withMessage('schoolCode kerak'),
  handleValidationErrors,
  authController.verifySchool
)

router.post(
  '/student/register',
  registerLimiter,
  body('fullName').trim().notEmpty(),
  body('phone').matches(phoneRegex).withMessage('Telefon +998XXXXXXXXX bo‘lishi kerak'),
  body('age').isInt({ min: 7, max: 18 }).withMessage('Yosh 7–18 oralig‘ida bo‘lishi kerak'),
  body('className').trim().notEmpty(),
  body('schoolId').isUUID().withMessage('schoolId UUID bo‘lishi kerak'),
  handleValidationErrors,
  authController.registerStudent
)

router.post(
  '/student/login',
  authLimiter,
  body('studentId').notEmpty(),
  handleValidationErrors,
  authController.studentLogin
)

router.post('/logout', verifyToken, authController.logout)

module.exports = router
