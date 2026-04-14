const express = require('express')
const studentController = require('../controllers/student.controller')
const { verifyToken, requireRole, requireOwnResult } = require('../middleware/auth')
const { testLimiter } = require('../middleware/rateLimit')

const router = express.Router()

router.use(verifyToken, requireRole('student'))

router.get('/me', studentController.getMe)
router.get('/me/results', studentController.getMyResults)
router.get('/me/results/:resultId', requireOwnResult, studentController.getMyResultById)

router.post('/test/submit', testLimiter, studentController.submitTest)

module.exports = router
