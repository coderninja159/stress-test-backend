const aiService = require('../services/ai.service')
const { NotFoundError } = require('../utils/errors')

async function studentExplanation(req, res, next) {
  try {
    const resultId = req.params.resultId
    const out = await aiService.studentExplanation(resultId)
    if (!out) return next(new NotFoundError('Natija topilmadi'))
    res.json({ success: true, ...out })
  } catch (e) {
    next(e)
  }
}

async function professionalAnalysis(req, res, next) {
  try {
    const resultId = req.params.resultId
    const out = await aiService.professionalAnalysis(resultId)
    if (!out) return next(new NotFoundError('Natija topilmadi'))
    res.json({ success: true, ...out })
  } catch (e) {
    next(e)
  }
}

module.exports = { studentExplanation, professionalAnalysis }
