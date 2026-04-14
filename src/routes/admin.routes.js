const express = require('express')
const adminController = require('../controllers/admin.controller')
const { verifyToken, requireRole } = require('../middleware/auth')

const router = express.Router()

router.use(verifyToken, requireRole('admin'))

router.get('/stats', adminController.getStats)
router.get('/schools', adminController.getSchools)
router.post('/schools', adminController.postSchool)
router.patch('/schools/:id', adminController.patchSchool)
router.get('/psychologists', adminController.getPsychologists)
router.post('/psychologists', adminController.postPsychologist)
router.delete('/psychologists/:id', adminController.deletePsychologist)
router.get('/students', adminController.getStudents)
router.get('/export', adminController.exportExcel)

module.exports = router
