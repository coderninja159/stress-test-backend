const jwt = require('jsonwebtoken')
const { supabase } = require('../config/supabase')

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Kirish uchun tizimga login qiling'
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const { data: user, error } = await supabase
      .from('users')
      .select('id, role, school_id, full_name, student_id')
      .eq('id', decoded.userId)
      .single()

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Foydalanuvchi topilmadi. Qayta login qiling'
      })
    }

    if (decoded.role !== user.role) {
      return res.status(403).json({
        success: false,
        message: 'Rol mos kelmaydi. Qayta login qiling'
      })
    }

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Sessiya muddati tugadi. Qayta login qiling'
      })
    }
    const preview =
      token && token.length > 12 ? `${token.slice(0, 8)}...` : token || 'bo‘sh'
    console.warn(`[XAVFSIZLIK] Yaroqsiz token ishlatildi: ${preview}`)
    return res.status(401).json({
      success: false,
      message: 'Token yaroqsiz'
    })
  }
}

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Avval tizimga kiring'
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      const path = req.originalUrl || req.path || ''
      console.warn(
        `[XAVFSIZLIK] ${req.user.role} roli ${path} ga kirmoqchi bo'ldi. ID: ${req.user.id}`
      )

      return res.status(403).json({
        success: false,
        message: "Bu sahifaga kirishga ruxsatingiz yo'q",
        yourRole: req.user.role,
        requiredRole: allowedRoles
      })
    }
    next()
  }
}

const requireSameSchool = async (req, res, next) => {
  if (req.user.role === 'admin') return next()

  if (req.user.role === 'psychologist') {
    const studentId = req.params.studentId || req.params.id

    if (studentId) {
      const { data: student } = await supabase
        .from('users')
        .select('school_id, role')
        .eq('id', studentId)
        .single()

      if (!student || student.school_id !== req.user.school_id) {
        console.warn(
          `[XAVFSIZLIK] Psixolog ID:${req.user.id} boshqa maktab (o‘quvchi maktabi:${student?.school_id || 'topilmadi'}) ga kirmoqchi bo‘ldi`
        )
        return res.status(403).json({
          success: false,
          message: "Bu o'quvchi sizning maktabingizda emas"
        })
      }

      if (student.role !== 'student') {
        return res.status(403).json({
          success: false,
          message: "Ruxsat yo'q"
        })
      }
    }
    return next()
  }

  if (req.user.role === 'student') {
    const targetId = req.params.id
    if (targetId && targetId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Faqat o'z ma'lumotlaringizga kirishingiz mumkin"
      })
    }
    return next()
  }

  next()
}

const requireOwnResult = async (req, res, next) => {
  if (req.user.role === 'admin') return next()

  const resultId =
    req.params.resultId ||
    req.params.id ||
    req.body?.resultId ||
    req.query?.resultId

  if (!resultId) {
    return res.status(400).json({
      success: false,
      message: 'resultId kerak'
    })
  }

  const { data: result } = await supabase
    .from('results')
    .select('id, user_id')
    .eq('id', resultId)
    .single()

  if (!result) {
    return res.status(404).json({
      success: false,
      message: 'Natija topilmadi'
    })
  }

  if (req.user.role === 'student' && result.user_id !== req.user.id) {
    console.warn(
      `[XAVFSIZLIK] Student ID:${req.user.id} boshqa natijaga (ID:${resultId}) kirmoqchi bo‘ldi`
    )
    return res.status(403).json({
      success: false,
      message: "Bu natija sizga tegishli emas"
    })
  }

  if (req.user.role === 'psychologist') {
    const { data: student } = await supabase
      .from('users')
      .select('school_id')
      .eq('id', result.user_id)
      .single()

    if (!student || student.school_id !== req.user.school_id) {
      console.warn(
        `[XAVFSIZLIK] Psixolog ID:${req.user.id} boshqa maktab natijasiga (result:${resultId}) kirmoqchi bo‘ldi`
      )
      return res.status(403).json({
        success: false,
        message: "Bu natijaga kirishga ruxsatingiz yo'q"
      })
    }
  }

  req.result = result
  next()
}

module.exports = {
  verifyToken,
  requireRole,
  requireSameSchool,
  requireOwnResult
}
