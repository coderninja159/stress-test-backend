const { supabase } = require('../config/supabase')
const adminService = require('../services/admin.service')
const { NotFoundError, ValidationError } = require('../utils/errors')

async function getStats(req, res, next) {
  try {
    const data = await adminService.globalStats()
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

async function getSchools(req, res, next) {
  try {
    const data = await adminService.listSchools()
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

async function postSchool(req, res, next) {
  try {
    const { code, name, is_active = true } = req.body
    if (!code || !name) return next(new ValidationError('code va name kerak'))
    const row = await adminService.createSchool({ code, name, is_active })
    res.status(201).json({ success: true, data: row })
  } catch (e) {
    next(e)
  }
}

async function patchSchool(req, res, next) {
  try {
    const row = await adminService.updateSchool(req.params.id, req.body)
    if (!row) return next(new NotFoundError('Maktab topilmadi'))
    res.json({ success: true, data: row })
  } catch (e) {
    next(e)
  }
}

async function getPsychologists(req, res, next) {
  try {
    const data = await adminService.listPsychologists()
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

async function postPsychologist(req, res, next) {
  try {
    const { email, password, fullName, schoolId } = req.body
    if (!email || !password || !fullName || !schoolId) {
      return next(new ValidationError('email, password, fullName, schoolId kerak'))
    }

    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })
    if (authErr || !authUser?.user) {
      return next(new ValidationError(authErr?.message || 'Auth yaratishda xato'))
    }

    const { data: row, error } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        full_name: fullName,
        school_id: schoolId,
        role: 'psychologist'
      })
      .select()
      .single()

    if (error) {
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw error
    }

    res.status(201).json({ success: true, data: row })
  } catch (e) {
    next(e)
  }
}

async function deletePsychologist(req, res, next) {
  try {
    const id = req.params.id
    const { data: user } = await supabase.from('users').select('role').eq('id', id).single()
    if (!user || user.role !== 'psychologist') {
      return next(new NotFoundError('Psixolog topilmadi'))
    }
    await supabase.from('users').delete().eq('id', id)
    await supabase.auth.admin.deleteUser(id)
    res.json({ success: true, message: 'O‘chirildi' })
  } catch (e) {
    next(e)
  }
}

async function getStudents(req, res, next) {
  try {
    const { rows, total } = await adminService.listAllStudents(req.query)
    res.json({ success: true, data: rows, total })
  } catch (e) {
    next(e)
  }
}

async function exportExcel(req, res, next) {
  try {
    const buf = await adminService.buildFullExportWorkbook()
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader('Content-Disposition', 'attachment; filename="full-export.xlsx"')
    res.send(buf)
  } catch (e) {
    next(e)
  }
}

module.exports = {
  getStats,
  getSchools,
  postSchool,
  patchSchool,
  getPsychologists,
  postPsychologist,
  deletePsychologist,
  getStudents,
  exportExcel
}
