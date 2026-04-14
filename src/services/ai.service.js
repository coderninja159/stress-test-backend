const { getGroqClient, getGroqModel } = require('../config/groq')
const { supabase } = require('../config/supabase')
const { ServerError } = require('../utils/errors')

async function getResultRow(resultId) {
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .eq('id', resultId)
    .single()
  if (error || !data) return null
  return data
}

async function saveStudentExplanation(resultId, text) {
  const { error } = await supabase
    .from('results')
    .update({ student_ai_explanation: text })
    .eq('id', resultId)
  if (error) console.warn('[ai] student_ai_explanation saqlanmadi:', error.message)
}

async function saveProfessionalAnalysis(resultId, text) {
  const { error } = await supabase
    .from('results')
    .update({ professional_ai_analysis: text })
    .eq('id', resultId)
  if (error) console.warn('[ai] professional_ai_analysis saqlanmadi:', error.message)
}

async function runGroqChat(system, user) {
  const client = getGroqClient()
  if (!client) throw new ServerError('Groq sozlanmagan')

  const completion = await client.chat.completions.create({
    model: getGroqModel(),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.4
  })

  const text = completion.choices?.[0]?.message?.content?.trim()
  if (!text) throw new ServerError('AI javob bermadi')
  return text
}

async function studentExplanation(resultId) {
  const row = await getResultRow(resultId)
  if (!row) return null

  if (row.student_ai_explanation) {
    return { text: row.student_ai_explanation, cached: true }
  }

  const system =
    'Siz yordamchi sifatida o‘quvchiga stress test natijasini sodda, xavfsiz tilda tushuntirasiz. Tibbiy diagnoz qo‘ymang.'
  const user = `Test turi: ${row.test_type}. Ball: ${row.score}. Xavf: ${row.risk_level}. Qisqa tushuntirish yozing (o‘zbek tilida).`

  const text = await runGroqChat(system, user)
  await saveStudentExplanation(resultId, text)
  return { text, cached: false }
}

async function professionalAnalysis(resultId) {
  const row = await getResultRow(resultId)
  if (!row) return null

  if (row.professional_ai_analysis) {
    return { text: row.professional_ai_analysis, cached: true }
  }

  const system =
    'Siz maktab psixologi uchun professional qisqa tahlil yozasiz. Etika va maxfiylikni saqlang; diagnoz o‘rniga maslahat va kuzatuv yo‘nalishlari.'
  const user = `Natija: test_type=${row.test_type}, score=${row.score}, risk=${row.risk_level}, answers=${JSON.stringify(row.answers || {})}. O‘zbek tilida qisqa tahlil.`

  const text = await runGroqChat(system, user)
  await saveProfessionalAnalysis(resultId, text)
  return { text, cached: false }
}

module.exports = {
  studentExplanation,
  professionalAnalysis,
  getResultRow
}
