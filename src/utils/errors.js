class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
  }
}

class ValidationError extends AppError {
  constructor(message = 'Noto‘g‘ri ma’lumot') {
    super(message, 400)
  }
}

class AuthError extends AppError {
  constructor(message = 'Kirish kerak') {
    super(message, 401)
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Ruxsat yo‘q') {
    super(message, 403)
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Topilmadi') {
    super(message, 404)
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Juda ko‘p urinish') {
    super(message, 429)
  }
}

class ServerError extends AppError {
  constructor(message = 'Ichki xatolik') {
    super(message, 500)
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServerError
}
