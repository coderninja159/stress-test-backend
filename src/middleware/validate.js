const { validationResult } = require('express-validator')
const { ValidationError } = require('../utils/errors')

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const first = errors.array({ onlyFirstError: true })[0]
    return next(new ValidationError(first?.msg || 'Validatsiya xatosi'))
  }
  next()
}

module.exports = { handleValidationErrors }
