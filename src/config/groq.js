const Groq = require('groq-sdk')

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null
  return new Groq({ apiKey })
}

function getGroqModel() {
  return process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
}

module.exports = { getGroqClient, getGroqModel }
