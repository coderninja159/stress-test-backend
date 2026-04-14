const { supabase } = require('../config/supabase')

async function getProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select(
      'id, full_name, student_id, phone, age, class_name, school_id, role, created_at'
    )
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return data
}

async function listMyResults(userId, { type, limit = 20, offset = 0 }) {
  let q = supabase
    .from('results')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)

  if (type) q = q.eq('test_type', type)

  const { data, error, count } = await q
  if (error) throw error
  return { rows: data || [], total: count ?? data?.length ?? 0 }
}

async function getResultById(resultId, userId) {
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .eq('id', resultId)
    .eq('user_id', userId)
    .single()
  if (error || !data) return null
  return data
}

/** Oddiy ball: javoblar qiymatlari yig‘indisi yoki berilgan score */
function computeScore(answers) {
  if (!answers || typeof answers !== 'object') return 0
  let sum = 0
  for (const v of Object.values(answers)) {
    const n = Number(v)
    if (!Number.isNaN(n)) sum += n
  }
  return sum
}

function riskFromScore(score) {
  if (score >= 40) return 'high'
  if (score >= 25) return 'medium'
  return 'low'
}

async function submitTest(userId, payload) {
  const { test_type = 'stress', answers, score: clientScore } = payload
  const score =
    clientScore != null && !Number.isNaN(Number(clientScore))
      ? Number(clientScore)
      : computeScore(answers)
  const risk_level = riskFromScore(score)

  const { data, error } = await supabase
    .from('results')
    .insert({
      user_id: userId,
      test_type,
      answers: answers || {},
      score,
      risk_level
    })
    .select()
    .single()

  if (error) throw error
  return data
}

module.exports = {
  getProfile,
  listMyResults,
  getResultById,
  submitTest,
  computeScore,
  riskFromScore
}
