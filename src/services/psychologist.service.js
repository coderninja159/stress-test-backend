const { supabase } = require('../config/supabase')
const XLSX = require('xlsx')

async function listStudents(schoolId, { className, risk, dateFrom, dateTo, limit = 50, offset = 0 }) {
  let q = supabase
    .from('users')
    .select('*', { count: 'exact' })
    .eq('school_id', schoolId)
    .eq('role', 'student')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)

  if (className) q = q.eq('class_name', className)

  const { data: students, error, count } = await q
  if (error) throw error
  let list = students || []

  if (risk || dateFrom || dateTo) {
    const ids = list.map((s) => s.id)
    if (ids.length === 0) return { rows: [], total: count ?? 0 }

    let rq = supabase.from('results').select('user_id, risk_level, created_at')
    rq = rq.in('user_id', ids)

    const { data: resRows } = await rq
    const latestByUser = {}
    for (const r of resRows || []) {
      const prev = latestByUser[r.user_id]
      if (!prev || new Date(r.created_at) > new Date(prev.created_at)) {
        latestByUser[r.user_id] = r
      }
    }
    list = list.filter((s) => {
      const lr = latestByUser[s.id]
      if (risk && (!lr || lr.risk_level !== risk)) return false
      if (dateFrom && lr && new Date(lr.created_at) < new Date(dateFrom)) return false
      if (dateTo && lr && new Date(lr.created_at) > new Date(dateTo)) return false
      if (dateFrom && !lr) return false
      if (dateTo && !lr) return false
      return true
    })
  }

  return { rows: list, total: count ?? list.length }
}

async function getStudent(studentId, schoolId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', studentId)
    .eq('school_id', schoolId)
    .eq('role', 'student')
    .single()
  if (error || !data) return null
  return data
}

async function listStudentResults(studentId, schoolId) {
  const st = await getStudent(studentId, schoolId)
  if (!st) return null
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .eq('user_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

async function schoolStats(schoolId) {
  const { count: studentCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('role', 'student')

  const { data: students } = await supabase
    .from('users')
    .select('id')
    .eq('school_id', schoolId)
    .eq('role', 'student')

  const ids = (students || []).map((s) => s.id)
  let results = []
  if (ids.length) {
    const { data } = await supabase.from('results').select('risk_level, score').in('user_id', ids)
    results = data || []
  }

  const riskCounts = { low: 0, medium: 0, high: 0 }
  for (const r of results) {
    if (riskCounts[r.risk_level] != null) riskCounts[r.risk_level]++
  }

  return {
    schoolId,
    students: studentCount ?? 0,
    resultsTotal: results.length,
    riskCounts
  }
}

async function buildSchoolExportWorkbook(schoolId) {
  const { data: students } = await supabase
    .from('users')
    .select('id, full_name, student_id, phone, class_name, age, created_at')
    .eq('school_id', schoolId)
    .eq('role', 'student')

  const ids = (students || []).map((s) => s.id)
  let results = []
  if (ids.length) {
    const { data } = await supabase
      .from('results')
      .select('*')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
    results = data || []
  }

  const wb = XLSX.utils.book_new()
  const ws1 = XLSX.utils.json_to_sheet(students || [])
  XLSX.utils.book_append_sheet(wb, ws1, 'students')
  const ws2 = XLSX.utils.json_to_sheet(results)
  XLSX.utils.book_append_sheet(wb, ws2, 'results')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

module.exports = {
  listStudents,
  getStudent,
  listStudentResults,
  schoolStats,
  buildSchoolExportWorkbook
}
