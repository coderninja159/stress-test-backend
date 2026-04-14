const express = require('express')
const aiController = require('../controllers/ai.controller')
const { verifyToken, requireRole, requireOwnResult } = require('../middleware/auth')
const { aiLimiter } = require('../middleware/rateLimit')

const router = express.Router()

router.post(
  '/student-explanation/:resultId',
  verifyToken,
  requireRole('student'),
  requireOwnResult,
  aiLimiter,
  aiController.studentExplanation
)

router.post(
  '/professional-analysis/:resultId',
  verifyToken,
  requireRole('psychologist'),
  requireOwnResult,
  aiLimiter,
  aiController.professionalAnalysis
)

module.exports = router
