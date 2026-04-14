const studentService = require('../services/student.service')
const { NotFoundError } = require('../utils/errors')

async function getMe(req, res, next) {
  try {
    const profile = await studentService.getProfile(req.user.id)
    if (!profile) return next(new NotFoundError('Profil topilmadi'))
    res.json({ success: true, data: profile })
  } catch (e) {
    next(e)
  }
}

async function getMyResults(req, res, next) {
  try {
    const { type, limit, offset } = req.query
    const { rows, total } = await studentService.listMyResults(req.user.id, {
      type,
      limit,
      offset
    })
    res.json({ success: true, data: rows, total })
  } catch (e) {
    next(e)
  }
}

async function getMyResultById(req, res, next) {
  try {
    const row = await studentService.getResultById(req.params.resultId, req.user.id)
    if (!row) return next(new NotFoundError('Natija topilmadi'))
    res.json({ success: true, data: row })
  } catch (e) {
    next(e)
  }
}

async function submitTest(req, res, next) {
  try {
    const row = await studentService.submitTest(req.user.id, req.body)
    res.status(201).json({ success: true, data: row })
  } catch (e) {
    next(e)
  }
}

module.exports = { getMe, getMyResults, getMyResultById, submitTest }
