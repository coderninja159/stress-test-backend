const psychologistService = require('../services/psychologist.service')
const { NotFoundError } = require('../utils/errors')

async function listStudents(req, res, next) {
  try {
    const { class: className, risk, dateFrom, dateTo, limit, offset } = req.query
    const { rows, total } = await psychologistService.listStudents(req.user.school_id, {
      className,
      risk,
      dateFrom,
      dateTo,
      limit,
      offset
    })
    res.json({ success: true, data: rows, total })
  } catch (e) {
    next(e)
  }
}

async function getStudent(req, res, next) {
  try {
    const row = await psychologistService.getStudent(req.params.studentId, req.user.school_id)
    if (!row) return next(new NotFoundError('O‘quvchi topilmadi'))
    res.json({ success: true, data: row })
  } catch (e) {
    next(e)
  }
}

async function getStudentResults(req, res, next) {
  try {
    const rows = await psychologistService.listStudentResults(
      req.params.studentId,
      req.user.school_id
    )
    if (rows === null) return next(new NotFoundError('O‘quvchi topilmadi'))
    res.json({ success: true, data: rows })
  } catch (e) {
    next(e)
  }
}

async function getStats(req, res, next) {
  try {
    const stats = await psychologistService.schoolStats(req.user.school_id)
    res.json({ success: true, data: stats })
  } catch (e) {
    next(e)
  }
}

async function exportExcel(req, res, next) {
  try {
    const buf = await psychologistService.buildSchoolExportWorkbook(req.user.school_id)
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader('Content-Disposition', 'attachment; filename="school-export.xlsx"')
    res.send(buf)
  } catch (e) {
    next(e)
  }
}

module.exports = {
  listStudents,
  getStudent,
  getStudentResults,
  getStats,
  exportExcel
}
