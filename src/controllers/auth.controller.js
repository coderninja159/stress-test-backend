const { supabase } = require('../config/supabase')
const { createToken } = require('../services/auth.service')
const { NotFoundError, ValidationError } = require('../utils/errors')

async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return next(new ValidationError('Email va parol kerak'))
    }

    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (authErr || !authData?.user) {
      return res.status(401).json({ success: false, message: 'Login yoki parol noto‘g‘ri' })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, role, school_id, student_id')
      .eq('id', authData.user.id)
      .single()

    if (error || !user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Siz admin emassiz' })
    }

    const token = createToken(user)
    return res.json({
      success: true,
      token,
      user: { id: user.id, fullName: user.full_name, role: user.role }
    })
  } catch (e) {
    next(e)
  }
}

async function psychologistLogin(req, res, next) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return next(new ValidationError('Email va parol kerak'))
    }

    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (authErr || !authData?.user) {
      return res.status(401).json({ success: false, message: 'Login yoki parol noto‘g‘ri' })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, role, school_id, student_id')
      .eq('id', authData.user.id)
      .single()

    if (error || !user || user.role !== 'psychologist') {
      return res.status(403).json({ success: false, message: 'Siz psixolog emassiz' })
    }

    let schoolName = null
    if (user.school_id) {
      const { data: school } = await supabase
        .from('schools')
        .select('name')
        .eq('id', user.school_id)
        .single()
      schoolName = school?.name || null
    }

    const token = createToken(user)
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        role: user.role,
        schoolId: user.school_id,
        schoolName
      }
    })
  } catch (e) {
    next(e)
  }
}

async function verifySchool(req, res, next) {
  try {
    const { schoolCode } = req.body
    if (!schoolCode) return next(new ValidationError('schoolCode kerak'))

    const { data: school, error } = await supabase
      .from('schools')
      .select('id, name')
      .eq('code', schoolCode)
      .eq('is_active', true)
      .single()

    if (error || !school) {
      return res.status(404).json({ success: false, message: "Maktab kodi noto‘g‘ri" })
    }

    return res.json({
      success: true,
      schoolId: school.id,
      schoolName: school.name
    })
  } catch (e) {
    next(e)
  }
}

async function registerStudent(req, res, next) {
  try {
    const { fullName, phone, age, className, schoolId } = req.body

    const { data: school, error: se } = await supabase
      .from('schools')
      .select('id')
      .eq('id', schoolId)
      .eq('is_active', true)
      .single()
    if (se || !school) return next(new ValidationError('Maktab topilmadi yoki faol emas'))

    const { data: dup } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'student')
      .eq('phone', phone)
      .eq('full_name', fullName)
      .maybeSingle()
    if (dup) {
      return res.status(409).json({ success: false, message: 'Bu ma’lumotlar bilan o‘quvchi allaqachon mavjud' })
    }

    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .like('student_id', `ST-${year}-%`)
    const nextNum = String((count || 0) + 1).padStart(4, '0')
    const student_id = `ST-${year}-${nextNum}`

    const { data: inserted, error } = await supabase
      .from('users')
      .insert({
        full_name: fullName,
        phone,
        age: Number(age),
        class_name: className,
        school_id: schoolId,
        role: 'student',
        student_id
      })
      .select('id, student_id, role, school_id')
      .single()

    if (error) throw error

    const token = createToken(inserted)
    return res.status(201).json({ success: true, token, studentId: inserted.student_id })
  } catch (e) {
    next(e)
  }
}

async function studentLogin(req, res, next) {
  try {
    const { studentId } = req.body
    if (!studentId) return next(new ValidationError('studentId kerak'))

    if (!/^ST-\d{4}-\d{4}$/.test(studentId)) {
      return next(new ValidationError('studentId formati: ST-YYYY-NNNN'))
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, role, school_id, student_id')
      .eq('student_id', studentId)
      .single()

    if (error || !user) {
      return next(new NotFoundError('O‘quvchi topilmadi'))
    }
    if (user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Bu akkaunt o‘quvchi emas' })
    }

    const token = createToken(user)
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        role: user.role,
        schoolId: user.school_id,
        studentId: user.student_id
      }
    })
  } catch (e) {
    next(e)
  }
}

async function logout(req, res) {
  res.json({ success: true, message: 'Muvaffaqiyatli chiqildi' })
}

module.exports = {
  adminLogin,
  psychologistLogin,
  verifySchool,
  registerStudent,
  studentLogin,
  logout
}
