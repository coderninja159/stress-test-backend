const express = require('express')
const psychologistController = require('../controllers/psychologist.controller')
const { verifyToken, requireRole, requireSameSchool } = require('../middleware/auth')

const router = express.Router()

router.use(verifyToken, requireRole('psychologist'))

router.get('/students', psychologistController.listStudents)
router.get(
  '/students/:studentId',
  requireSameSchool,
  psychologistController.getStudent
)
router.get(
  '/students/:studentId/results',
  requireSameSchool,
  psychologistController.getStudentResults
)
router.get('/stats', psychologistController.getStats)
router.get('/export', psychologistController.exportExcel)

module.exports = router
