require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const { supabase } = require('./config/supabase')
const { AppError } = require('./utils/errors')

const authRoutes = require('./routes/auth.routes')
const studentRoutes = require('./routes/student.routes')
const psychologistRoutes = require('./routes/psychologist.routes')
const adminRoutes = require('./routes/admin.routes')
const aiRoutes = require('./routes/ai.routes')
const smsRoutes = require('./routes/sms.routes')

const app = express()
app.set('trust proxy', 1)

const frontend = process.env.FRONTEND_URL || '*'
app.use(
  cors({
    origin: frontend === '*' ? true : frontend.split(',').map((s) => s.trim()),
    credentials: true
  })
)
app.use(helmet())
app.use(express.json({ limit: '1mb' }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

app.use('/api/auth', authRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/psychologist', psychologistRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/sms', smsRoutes)

app.get('/api/health', async (req, res) => {
  const payload = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'unknown'
  }
  try {
    const { error } = await supabase.from('schools').select('id').limit(1)
    payload.database = error ? 'error' : 'connected'
    if (error) payload.status = 'degraded'
  } catch {
    payload.database = 'error'
    payload.status = 'degraded'
  }
  const code = payload.status === 'ok' ? 200 : 503
  res.status(code).json(payload)
})

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint topilmadi' })
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Sessiya muddati tugadi. Qayta login qiling'
    })
  }
  if (err.name === 'JsonWebTokenError') {
    console.warn('[XAVFSIZLIK] JWT xatosi:', err.message)
    return res.status(401).json({ success: false, message: 'Token yaroqsiz' })
  }

  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({ success: false, message: err.message })
  }

  const code = err.code || err?.cause?.code
  if (code === '23505') {
    return res.status(409).json({ success: false, message: 'Allaqachon mavjud' })
  }

  console.error(err)
  const isDev = process.env.NODE_ENV === 'development'
  res.status(500).json({
    success: false,
    message: isDev ? err.message : 'Ichki xatolik',
    ...(isDev && { stack: err.stack })
  })
})

const PORT = Number(process.env.PORT) || 3000
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API ${PORT} portda`)
  })
}

module.exports = app
