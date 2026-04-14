const { supabase } = require('../config/supabase')
const XLSX = require('xlsx')

async function globalStats() {
  const { count: schools } = await supabase
    .from('schools')
    .select('*', { count: 'exact', head: true })

  const { count: students } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')

  const { count: psychologists } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'psychologist')

  const { count: results } = await supabase.from('results').select('*', { count: 'exact', head: true })

  return {
    schools: schools ?? 0,
    students: students ?? 0,
    psychologists: psychologists ?? 0,
    results: results ?? 0
  }
}

async function listSchools() {
  const { data, error } = await supabase.from('schools').select('*').order('name')
  if (error) throw error
  return data || []
}

async function createSchool(body) {
  const { data, error } = await supabase.from('schools').insert(body).select().single()
  if (error) throw error
  return data
}

async function updateSchool(id, patch) {
  const { data, error } = await supabase.from('schools').update(patch).eq('id', id).select().single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

async function listPsychologists() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, school_id, created_at')
    .eq('role', 'psychologist')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

async function listAllStudents(query) {
  const limit = Math.min(Number(query.limit) || 100, 500)
  const offset = Number(query.offset) || 0
  let q = supabase
    .from('users')
    .select('*', { count: 'exact' })
    .eq('role', 'student')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (query.school_id) q = q.eq('school_id', query.school_id)

  const { data, error, count } = await q
  if (error) throw error
  return { rows: data || [], total: count ?? 0 }
}

async function buildFullExportWorkbook() {
  const [{ data: schools }, { data: users }, { data: results }] = await Promise.all([
    supabase.from('schools').select('*'),
    supabase.from('users').select('*'),
    supabase.from('results').select('*')
  ])

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(schools || []), 'schools')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(users || []), 'users')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(results || []), 'results')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

module.exports = {
  globalStats,
  listSchools,
  createSchool,
  updateSchool,
  listPsychologists,
  listAllStudents,
  buildFullExportWorkbook
}
